"""Bounded, display-only interpretation of CREAO plan JSON. Never executes content."""
import json

def display_text(value, limit=2400):
    if isinstance(value, str):
        return value[:limit]
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)[:limit]
    return '' if value is None else str(value)[:limit]

def structured_plan(value):
    if isinstance(value, str):
        try:
            value = json.loads(value.strip().removeprefix('```json').removesuffix('```').strip())
        except ValueError:
            # Agents may wrap the actual JSON in narration or a Markdown fence.
            # Decode candidate objects as data; never execute or infer missing actions.
            decoder=json.JSONDecoder()
            for index in [i for i,c in enumerate(value[:100000]) if c=='{'][:100]:
                try:
                    candidate,_=decoder.raw_decode(value[index:])
                    parsed=structured_plan(candidate)
                    if parsed: return parsed
                except ValueError:
                    continue
            return None
    if not isinstance(value, dict):
        return None
    if isinstance(value.get('plan'), dict):
        value = value['plan']
    actions = value.get('actions')
    if not isinstance(actions, list) or not actions:
        return None
    clean = []
    for index, action in enumerate(actions[:3]):
        if not isinstance(action, dict) or not isinstance(action.get('title'), str):
            continue
        clean.append({'id':str(index), 'title':action['title'][:240],
            'explanation':display_text(action.get('explanation') or action.get('description')),
            'timing':display_text(action.get('timing')),
            'completion':display_text(action.get('completion_condition') or action.get('completion')),
            'cost':display_text(action.get('cost_uncertainty') or action.get('cost')),
            'evidence':display_text(action.get('evidence_references') or action.get('evidence'))})
    if not clean:
        return None
    def items(key):
        values = value.get(key, [])
        if not isinstance(values, list): values = [values]
        return [display_text(v) for v in values[:12] if v]
    return {'summary':display_text(value.get('summary')), 'actions':clean,
            'missing_information':items('missing_information'), 'assumptions':items('assumptions'),
            'changes':items('changes_from_previous_plan')}
