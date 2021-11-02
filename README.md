# Cookiebot Datastudio Community Connector
A Google Data Studio Community Connector for use with the Cookiebot API. Takes the following parameters:
- API key: your Cookiebot API key as found in your account under settings > your scripts
- Domain Group ID (serial): the unique identifier for a domain (group) under your account
- Domain: the domain you are capturing consents on as visible in your cookiebot account, e.g. `www.example.com`

The connector can return the following fields from the API on per-day basis in the date range:
- *Metrics*: OptIn, OptOut, OptInImplied, TypeOptInPref, TypeOptInStat, TypeOptInMark, BulkOptInImplied, BulkOptInStrict, countryConsents
- *Dimensions*: date (day), domain, country
