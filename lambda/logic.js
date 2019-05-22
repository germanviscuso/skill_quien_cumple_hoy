const moment = require('moment-timezone'); // will help us do all the birthday math
const axios = require('axios');

module.exports = {
    getAdjustedDateData(timezone) {
        const today = moment().tz(timezone).startOf('day');

        return {
            day: today.date(),
            month: today.month() + 1
        }
    },
    fetchBirthdaysData(day, month, limit){
        const endpoint = 'https://query.wikidata.org/sparql';
        // List of actors with pictures and date of birth for a given day and month
        const sparqlQuery =
        `SELECT DISTINCT ?human ?humanLabel ?picture ?date_of_birth ?place_of_birthLabel WHERE {
          ?human wdt:P31 wd:Q5;
            wdt:P106 wd:Q33999;
            wdt:P18 ?picture.
          FILTER((DATATYPE(?date_of_birth)) = xsd:dateTime)
          FILTER((MONTH(?date_of_birth)) = ${month})
          FILTER((DAY(?date_of_birth)) = ${day})
          FILTER ( bound(?place_of_birth) )
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
          OPTIONAL { ?human wdt:P569 ?date_of_birth. }
          OPTIONAL { ?human wdt:P19 ?place_of_birth. }
        }
        LIMIT ${limit}`;
        
        const url = endpoint + '?query=' + encodeURIComponent(sparqlQuery);
        console.log(url);

        var config = {
            timeout: 6500, // timeout api call before we reach Alexa's 8 sec timeout, or set globally via axios.defaults.timeout
            headers: {'Accept': 'application/sparql-results+json'}
        };

        async function getJsonResponse(url, config){
            const res = await axios.get(url, config);
            return res.data;
        }

        return getJsonResponse(url, config).then((result) => {
            return result;
        }).catch((error) => {
            return null;
        });
    },
    callDirectiveService(handlerInput, msg) {
        // Call Alexa Directive Service.
        const {requestEnvelope} = handlerInput;
        const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();
        const requestId = requestEnvelope.request.requestId;
        const {apiEndpoint, apiAccessToken} = requestEnvelope.context.System;

        // build the progressive response directive
        const directive = {
          header: {
            requestId,
          },
          directive:{
              type: 'VoicePlayer.Speak',
              speech: msg
          },
        };
        // send directive
        return directiveServiceClient.enqueue(directive, apiEndpoint, apiAccessToken);
    },
    convertBirthdateToYearsOld(person, timezone) {
        const today = moment().tz(timezone).startOf('day');
        const wasBorn = moment(person.date_of_birth.value).tz(timezone).startOf('day');
        return today.diff(wasBorn, 'years');
    }
}
