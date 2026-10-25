"""Server-side adapters. Injected HTTP transport makes tests fully offline."""
import json
import re
import urllib.request
import urllib.error
from urllib.parse import quote, urlsplit, parse_qs, urljoin

class IntegrationError(RuntimeError):
    pass

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_json(method, url, headers, body=None):
    encoded = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=encoded, method=method,
        headers={'Accept': 'application/json', 'User-Agent': 'Advisore-Diagnostic/1.0',
                 **headers, 'Content-Type': 'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=30) as response:
            raw = response.read(2_000_001)
            if len(raw) > 2_000_000:
                raise IntegrationError('Remote response exceeded the supported size.')
            return json.loads(raw), dict(response.headers)
    except urllib.error.HTTPError as exc:
        detail = 'non-JSON error response'
        try:
            error = json.loads(exc.read(16384))
            codes = []
            def collect(value):
                if isinstance(value, dict):
                    for name, item in value.items():
                        if name.lower() in ('code', 'errorcode', 'error_code', 'error') and isinstance(item, str) and re.fullmatch(r'[A-Z][A-Z0-9_]{2,80}', item):
                            codes.append(item)
                        elif isinstance(item, (dict, list)):
                            collect(item)
                elif isinstance(value, list):
                    for item in value:
                        collect(item)
            collect(error)
            detail = ', '.join(sorted(set(codes))) or 'JSON error without symbolic code'
        except (ValueError, OSError):
            pass
        raise IntegrationError('Remote request returned HTTP ' + str(exc.code) + ' (' + detail + '). No automatic retry was made.') from None
    except (urllib.error.URLError, ValueError, TimeoutError) as exc:
        # Do not leak response bodies, credentials or request payloads.
        raise IntegrationError('Remote request failed; no automatic retry was made') from None

def request_artifact_json(method, url, headers, body=None):
    """Follow a CREAO download's signed storage redirect without forwarding the key."""
    current=url
    current_headers=dict(headers)
    for attempt in range(3):
        req=urllib.request.Request(current, method='GET', headers={
            'Accept':'application/json', 'User-Agent':'Advisore-Diagnostic/1.0', **current_headers})
        try:
            with urllib.request.build_opener(NoRedirect).open(req,timeout=30) as response:
                raw=response.read(2_000_001)
                if len(raw)>2_000_000: raise IntegrationError('Plan artifact is too large.')
                return json.loads(raw),dict(response.headers)
        except urllib.error.HTTPError as exc:
            if exc.code not in (301,302,303,307,308):
                raise IntegrationError('Plan artifact returned HTTP '+str(exc.code)+'.') from None
            destination=urljoin(current,exc.headers.get('Location',''))
            try:
                parsed=urlsplit(destination)
                port=parsed.port
            except ValueError:
                raise IntegrationError('Plan download returned an invalid redirect.') from None
            host=parsed.hostname or ''
            storage=(host=='storage.googleapis.com' or host.endswith('.storage.googleapis.com')
                     or host=='firebasestorage.googleapis.com'
                     or host=='storage-bucket-creao-user-upload-production.s3.us-west-2.amazonaws.com')
            if (parsed.scheme!='https' or parsed.username or parsed.password
                    or port not in (None,443) or not storage):
                raise IntegrationError('Plan download redirected to an unsupported storage host: '+host) from None
            # The signed location authorizes the download. Never send the CREAO
            # bearer token to the storage service, even when following more hops.
            current=destination
            current_headers={}
        except (urllib.error.URLError,ValueError,TimeoutError):
            raise IntegrationError('Plan artifact download failed.') from None
    raise IntegrationError('Plan artifact redirected too many times.')

class CRSSandbox:
    BASE = 'https://api-sandbox.stitchcredit.com/api'
    ROUTES = {
        'transunion': '/transunion/credit-report/standard/tu-prequal-fico9',
        'equifax': '/equifax/credit-report/standard/efx-prequal-vantage4',
        'experian': '/experian/credit-report/standard/exp-prequal-vantage4',
    }

    def __init__(self, username, password, personas, http=request_json):
        if not username or not password:
            raise ValueError('CRS sandbox credentials are required')
        self.username, self.password, self.personas = username, password, personas
        self.http, self.token = http, None

    def login(self):
        try:
            result, _ = self.http('POST', self.BASE + '/users/login', {},
                {'username': self.username, 'password': self.password})
        except IntegrationError as exc:
            raise IntegrationError('CRS LOGIN failed: ' + str(exc)) from None
        if not isinstance(result, dict) or not isinstance(result.get('token'), str) or not result['token']:
            raise IntegrationError('CRS did not return a usable token; stop and check credentials')
        self.token = result['token']

    def report(self, persona_id, bureau='transunion'):
        # No arbitrary identities from SMS. Registry must be populated from official test data.
        if bureau not in self.ROUTES or persona_id not in self.personas:
            raise ValueError('Choose an installed official sandbox persona and supported bureau')
        payload = self.personas[persona_id].get(bureau)
        if not isinstance(payload, dict) or not payload:
            raise ValueError('Official persona request for this bureau is missing')
        if not self.token:
            self.login()
        try:
            result, headers = self.http('POST', self.BASE + self.ROUTES[bureau],
                {'Authorization': 'Bearer ' + self.token}, payload)
        except IntegrationError as exc:
            raise IntegrationError('CRS login succeeded, but REPORT access failed: ' + str(exc)) from None
        if not isinstance(result, dict) or result.get('errorMessages'):
            raise IntegrationError('CRS returned a report error; do not generate advice from it')
        return {'raw_report': result, 'request_id': next((v for k, v in headers.items() if k.lower() == 'requestid'), None),
                'bureau': bureau, 'source': 'CRS sandbox'}

class CreaoPlanner:
    BASE = 'https://agent.creao.ai/api/v1'
    def __init__(self, key, agent_id, http=request_json):
        if not key.startswith('capi_') or not agent_id:
            raise ValueError('Use an app-scoped capi_ key and saved agent ID')
        self.key, self.agent_id, self.http = key, quote(agent_id, safe=''), http
        self.download=request_artifact_json if http is request_json else http

    def start(self, context, idempotency_key, thread_id=None):
        if not 8 <= len(idempotency_key) <= 128:
            raise ValueError('Idempotency key must contain 8–128 characters')
        body = {'inputs': {'prompt': json.dumps(context)}, 'idempotencyKey': idempotency_key}
        if thread_id:
            body['threadId'] = thread_id
        result, _ = self.http('POST', self.BASE + '/apps/' + self.agent_id + '/runs',
            {'Authorization': 'Bearer ' + self.key}, body)
        if not isinstance(result, dict) or not result.get('id'):
            raise IntegrationError('CREAO did not return a run ID')
        return result

    def poll(self, run_id):
        # Authenticated polling is also how a callback must be verified.
        result, _ = self.http('GET', self.BASE + '/runs/' + quote(run_id, safe=''),
            {'Authorization': 'Bearer ' + self.key})
        return result

    def artifact(self, run_id, url):
        # Only this run's observed download endpoint may receive the scoped key.
        parsed = urlsplit(url)
        expected = '/api/v1/runs/' + quote(run_id, safe='') + '/artifacts/download'
        query = parse_qs(parsed.query)
        if (parsed.scheme != 'https' or parsed.netloc != 'agent.creao.ai'
                or parsed.path != expected or parsed.fragment
                or set(query) != {'artifactId'} or len(query['artifactId']) != 1):
            raise IntegrationError('Unsupported CREAO artifact address.')
        result, _ = self.download('GET', url, {'Authorization':'Bearer ' + self.key})
        return result
