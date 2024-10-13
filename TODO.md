# TODO

## Batch Limit

SPEC:

1. for early access round **and** non-early access round, must be auto-adjusting

TODO:

- add new field to batch config `TOTAL_2` specifies the final limit (the 1050000!)
  - [x] adapt validation: if early access = false, make sure TOTAL_2 is set
- make sure that for non-early access, the `TOTAL_2` is used **and** there is auto-adjusting
  - [ ] in `Batch.js` add helper function to determine which limit should be used `getTotalLimit` and use that limit

_Note_: for a non-early access round, `TOTAL` is only used for determining the individual limit

## Individual Limits

### 1. for early access round

SPEC:

- individual limit must be auto-adjusting

### 2. for non-early-access:

SPEC:

- if total contributions < 1mio => individual limit: 2500
- if total contributions > 1mio => individual limit: 250

TODO:

- add new field to batch config `INDIVIDUAL_2` specifies the fallback individual limit (the 250!)
  - [ ] adapt validation: if early access = false, make sure INDIVIDUAL_2 is set
  - [ ] adapt logic: if early access = false AND total contributions exceed TOTAL (but are smaller than TOTAL_2), use INDIVIDUAL_2 instead of INDIVIDUAL
    - [ ] in `Batch.js` add helper funtion to determine which individual limit should be used `getIndividualLimit` and use that individual limit
