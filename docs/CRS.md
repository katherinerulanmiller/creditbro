# How Creditbro uses CRS

## Sponsor overview

Creditbro is a credit coach college students can text. We use CRS to give the conversation credit-report context, so the coach can explain specific reported facts instead of offering only generic advice. In our hackathon prototype, CRS sandbox requests use the official fictional P03 persona. The integration supports Equifax, TransUnion, and Experian reports and preserves the bureau, score model, and date associated with the evidence.

Our backend turns selected report fields into a compact credit snapshot. Claude uses that context to explain credit concepts, while CREAO can use it in a project the student explicitly requests and authorizes, such as preparing for a first apartment. Creditbro turns a report into something a student can ask questions about and connect to a next step.

## What we implemented

1. **Authenticate server-side.** The sandbox adapter obtains a token using privately configured CRS credentials.
2. **Request the sanctioned fictional reports.** `fetchOfficialReports` uses the official P03 request structure for each supported bureau. The public fixture has identity values redacted; the live path requires a sponsor-provided fictional fixture through `CREDITBRO_CRS_PERSONA_FILE`.
3. **Validate the response.** HTTP success alone is insufficient. Report-level `errorMessages`, missing files, and missing usable facts are handled explicitly. A failed bureau request is represented as unavailable rather than invented data.
4. **Normalize selected evidence.** The application extracts scores, model names, account types/statuses, reported balances, limits, past-due amounts, and opening/reporting dates. It calculates revolving utilization from supplied balance and limit using code.
5. **Preserve provenance.** Each snapshot includes its sandbox environment, persona ID, bureau, retrieval time, and source references. Score/model entries remain separate; account reporting dates remain attached.
6. **Use it in context.** For the selected P03 demo, the coach can receive the normalized evidence. An authorized CREAO planning request includes usable CRS snapshots and a source catalog so returned recommendations can be checked against the supplied facts.

## Example demo interaction

A fictional student asks: “What does my card usage mean?”

If the selected report contains a $90 reported revolving balance and a $500 limit, the application calculates 18% utilization. Creditbro can explain what that percentage represents and identify it as a reported snapshot. Those amounts are illustrative, not a claim about every P03 bureau response. The coach must not present the report balance as today's balance, infer an issuer due date, or promise a score increase.

For an apartment project, credit context can inform proposed next steps alongside student-provided goals. It does not determine rental eligibility or guarantee approval.

## Data boundaries

The normalized object omits identity-request fields, account numbers, names, addresses, and the raw report body. It uses generated account identifiers and source references for the extracted facts. The public repository contains no full report responses or credentials.

CRS and Nessie are independently selected fictional sources; Creditbro does not claim that they are a verified identity match. Reported credit balances are not checking-account cash, statement balances, or payment deadlines. A snapshot with no past-due amount does not prove a complete history of on-time payments.

This implementation uses credit reports. Identity verification, employment screening, and real consumer credit access are separate capabilities and are not claimed as implemented.

## Code and validation

| File | Responsibility |
| --- | --- |
| [`backend/crs.mjs`](../backend/crs.mjs) | Official requests, retrieval, normalization, and loading saved evidence |
| [`backend/crs-sandbox.mjs`](../backend/crs-sandbox.mjs) | Authentication diagnostic without claiming report access |
| [`backend/core.mjs`](../backend/core.mjs) | Coaching context and host-owned calculations |
| [`backend/pipeline.mjs`](../backend/pipeline.mjs) | Authorized planning packets and result validation |
| [`backend/crs.test.mjs`](../backend/crs.test.mjs) | CRS adapter tests |
| [`backend/crs-sandbox.test.mjs`](../backend/crs-sandbox.test.mjs) | Sandbox authentication tests |

Run `npm test` from the repository root for the automated suite. These tests are not proof of a fresh live provider request or phone delivery. Provider credentials, sanctioned sandbox fixtures, and intentional end-to-end testing are needed for a live demonstration; see [setup](SETUP.md).

## What comes next

A future consumer version would need an appropriate real-report access flow, user authorization, identity handling, and operational safeguards agreed with the provider. The current demo establishes the report-to-coaching integration using fictional data; it does not connect a student's real credit file.
