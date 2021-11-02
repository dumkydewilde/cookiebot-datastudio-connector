var cc = DataStudioApp.createCommunityConnector();

function getAuthType() {
  var AuthTypes = cc.AuthType;
  return cc
    .newAuthTypeResponse()
    .setAuthType(AuthTypes.NONE)
    .build();
}


/**
* Configuration for connector: API Key, Domain ID (serial) and domain
**/
function getConfig(request) {
  var config = cc.getConfig();
  
  config.newInfo()
    .setId('instructions')
    .setText('Enter the Cookiebot API key (found under settings > your scripts), the domain group ID and the registered domain URL (find more details on: https://support.cookiebot.com/hc/en-us/articles/360006346473-Extracting-cookie-information-via-API).');
  
  config.newTextInput()
    .setId('apikey')
    .setName('API Key')
    .setHelpText('')
    .setPlaceholder('Your API key');
  
  config.newTextInput()
    .setId('serial')
    .setName('Domain Group ID (serial)')
    .setHelpText('')
    .setPlaceholder('THe domain group ID ');

  config.newTextInput()
    .setId('domain')
    .setName('Domain Name (URL as registered/visible in Cookiebot)')
    .setHelpText('')
    .setPlaceholder('www.example.com');
  
  config.newCheckbox()
  .setId('includeCountries')
  .setName('Include number of consents per country ')
  .setHelpText('This will include both the daily totals (opt-in, opt-out, etc.) as well as the count of consents per country in every row which can cause problems when reaggregating.')
    

  config.setDateRangeRequired(true);
  
  return config.build();
}


/**
* Fields returned by the API: 
* Metrics: OptIn, OptOut, OptInImplied, TypeOptInPref, TypeOptInStat, TypeOptInMark, BulkOptInImplied, BulkOptInStrict, countryConsents
* Dimensions: date (day), domain, country
**/
function getFields(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;
  
  fields.newMetric()
    .setId('OptIn')
    .setName('Opt-ins')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
  
  fields.newMetric()
    .setId('OptOut')
    .setName('Opt-outs')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('OptInImplied')
    .setName('Implied Opt-ins')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('OptInStrict')
    .setName('Strict Opt-ins')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
    
  fields.newMetric()
    .setId('TypeOptInPref')
    .setName('Preferences Opt-ins')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('TypeOptInStat')
    .setName('Statistics Opt-ins')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('TypeOptInMark')
    .setName('Marketing Opt-ins')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
    
  fields.newMetric()
    .setId('BulkOptInImplied')
    .setName('Bulk Opt-ins Implied')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newMetric()
    .setId('BulkOptInStrict')
    .setName('Bulk Opt-ins Strict')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
  
  if (request && request.configParams.includeCountries) {    
    fields.newMetric()
      .setId('countryConsents')
      .setName('Country Consent Count')
      .setDescription('Number of consents per country. This will also include the totals per row per day for the metrics above which can cause problems when reaggregating/summing data.')
      .setType(types.NUMBER)
      .setAggregation(aggregations.SUM);
  }

  fields.newDimension()
    .setId('date')
    .setName('Date (Daily)')
    .setType(types.YEAR_MONTH_DAY);
  
  fields.newDimension()
    .setId('domain')
    .setName('Domain Name')
    .setType(types.TEXT);
  
  if (request && request.configParams.includeCountries) {
    fields.newDimension()
      .setId('country')
      .setDescription('Two letter country code. This will also include the totals per row per day for the metrics above which can cause problems when reaggregating/summing data.')
      .setName('Country Code')
      .setType(types.TEXT);
  }

  return fields;
}

function getSchema(request) {
  var fields = getFields(request).build();
  return { schema: fields };
}

function responseToRows(requestedFields, response, domain, includeCountries) {
  rows = [];  
  // Transform parsed data and filter for requested fields
  response.forEach(function(day) {
    var iterable = includeCountries && day.Countries && day.Countries.Country ? day.Countries.Country : [day];
    iterable.forEach(function(el) { 
       var row = [];
      requestedFields.asArray().forEach(function (field) {
        switch (field.getId()) {
          case 'date':
            return row.push(day.Date.split('T')[0].replace(/-/g, ''));
  
          case "OptIn":
            return row.push(day.OptIn);
  
          case "OptOut":
            return row.push(day.OptOut);
  
          case "OptInImplied":
            return row.push(day.OptInImplied);
          
          case "OptInStrict":
            return row.push(day.OptInStrict);
          
          case "TypeOptInPref":
            return row.push(day.TypeOptInPref);
  
          case "TypeOptInStat":
            return row.push(day.TypeOptInStat);
  
          case "TypeOptInMark":
            return row.push(day.TypeOptInMark);
  
          case "BulkOptInImplied":
            return row.push(day.BulkOptInImplied);
  
          case "BulkOptInStrict":
            return row.push(day.BulkOptInStrict);
   
          case 'domain':
            return row.push(domain);
            
          case 'country':
            return row.push(el.Code);
            
          case 'countryConsents':
            return row.push(el.Count);
            
          default:
            return row.push('');
        }
      });
      rows.push({ values: row });
    });
  });
  
  return rows
}

function getData(request) {
    var requestedFieldIds = request.fields.map(function(field) {
      return field.name;
    });
    var requestedFields = getFields().forIds(requestedFieldIds);
  
    // Fetch and parse data from API
    var url = [ 
      "https://consent.cookiebot.com/api/v1/",
      request.configParams.apikey,
      "/json/domaingroup/",
      request.configParams.serial, 
      "/domain/",
     request.configParams.domain,
      "/consent/stats?startdate=",
      request.dateRange.startDate.replace(/-/g, ''),
      "&enddate=",
      request.dateRange.endDate.replace(/-/g, '')
    ].join("");
  
    var response = UrlFetchApp.fetch(url);
    var parsedResponse = JSON.parse(response).consentstat.consentday;
    var rows = responseToRows(requestedFields, parsedResponse, request.configParams.domain, request.configParams.includeCountries);


  return {
    schema: requestedFields.build(),
    rows: rows
  };
}


function test() {
  exampleRequest = {
    configParams: {
      apikey: 'API_KEY',
      serial: 'DOMAIN_ID',
      domain: 'DOMAIN',
      includeCountries: false
    },
    dateRange: {
      endDate: '2021-10-31',
      startDate: '2021-10-01'
    },
    fields: [
      {
        name: 'OptIn',
      },
      {
        name: 'domain'
      }
    ]
  }
  
  Logger.log(getData(exampleRequest))  
}
