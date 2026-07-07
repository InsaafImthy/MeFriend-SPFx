# API Contract Status

| Area | Status | Notes |
| --- | --- | --- |
| Customer Creation API | Available | Contract fields and payload mapping are known. |
| Event API | Pending | No confirmed API contract found in the current repository. |
| Salesperson API | Pending | No confirmed API contract found in the current repository. |
| Invoice API | Pending | No confirmed API contract found in the current repository. |
| Sales Order API | Pending | No confirmed API contract found in the current repository. |
| Sales Order related invoices API | Pending | No confirmed API contract found in the current repository. |

## Customer Creation Mapping

The customer creation payload must map frontend fields to the API contract as follows:

- `customerName` -> `name`
- `customerCode` -> `name2`
- `address` -> `address`
- `stateCode` -> `stateCode`
- `countryCode` -> `countryRegionCode`
- `city` -> `city`
- `postCode` -> `postCode`
- `locationCode` -> `locationCode`
- `panNo` -> `pANNo`
- `gstNo` -> `gstRegistrationNo`
- `customerCode` -> `regionCode` where required
- `branch` -> `custDimensions` item with `dimensionCode` `BRANCH`
- `department` -> `custDimensions` item with `dimensionCode` `DEPARTMENT`

Include the `PRODUCT` dimension and required default Business Central fields if required by the uploaded API contract.

## Pending Contract Rule

Pending APIs must be isolated behind typed service placeholders. Do not invent final Business Central endpoints, hardcode fake UI records, or scatter TODOs through React components.
