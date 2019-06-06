const logic = require('./logic');
const constants = require('./constants');
const util = require('./util');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        return CelebrityBirthdaysIntentHandler.handle(handlerInput);
    }
};

const CelebrityBirthdaysIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CelebrityBirthdaysIntent';
    },
    async handle(handlerInput) {
        let timezone = 'Europe/Madrid'; // fetch from ask ups service client api

        try {
            // call the progressive response service
            await logic.callDirectiveService(handlerInput, handlerInput.t('PROGRESSIVE_MSG'));
          } catch (error) {
            // if it fails we can continue, but the user will wait without progressive response
            console.log("Progressive directive error : " + error);
        }

        const dateData = logic.getAdjustedDateData(timezone);
        const response = await logic.fetchBirthdaysData(dateData.day, dateData.month, constants.MAX_BIRTHDAYS);

        let speechText = handlerInput.t('API_ERROR_MSG');

        let results;
        if(response) {
            console.log(JSON.stringify(response));
            results = response.results.bindings;
            speechText = handlerInput.t('CELEBRITY_BIRTHDAYS_MSG');
            results.forEach((person, index) => {
                console.log(person);
                const age = logic.convertBirthdateToYearsOld(person, timezone);
                person.date_of_birth.value = handlerInput.t('LIST_YO_ABBREV_MSG', {count: age});
                if(index === Object.keys(results).length - 2)
                    speechText += person.humanLabel.value + handlerInput.t('CONJUNCTION_MSG');
                else
                    speechText += person.humanLabel.value + '. '
            });
        }

        // Add APL directive to response
        if (util.supportsAPL(handlerInput) && results) {
            const {Viewport} = handlerInput.requestEnvelope.context;
            const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.0',
                document: constants.APL.listDoc,
                datasources: {
                    listData: {
                        type: 'object',
                        properties: {
                            config: {
                                backgroundImage: util.getS3PreSignedUrl('Media/lights_dark_'+resolution+'.png'),
                                title: handlerInput.t('LIST_HEADER_MSG'),
                                hintText: handlerInput.t('LIST_HINT_MSG')
                            },
                            list: {
                                listItems: results
                            }
                        },
                        transformers: [{
                            inputPath: 'config.hintText',
                            transformer: 'textToHint'
                        }]
                    }
                }
            });
        }

        // Add card to response
        handlerInput.responseBuilder.withStandardCard(
                handlerInput.t('LIST_HEADER_MSG'),
                speechText,
                util.getS3PreSignedUrl('Media/lights_480x480.png'));

        speechText += handlerInput.t('SHORT_HELP_MSG');

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('HELP_MSG'))
            .getResponse();
    }
};

const TouchIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'Alexa.Presentation.APL.UserEvent';
    },
    handle(handlerInput) {
        console.log('Touch event arguments: ' + JSON.stringify(handlerInput.requestEnvelope.request.arguments[0]));
        let person = JSON.parse(handlerInput.requestEnvelope.request.arguments[0]);
        let speechText = handlerInput.t('LIST_PERSON_DETAIL_MSG', {person: person});

        speechText += handlerInput.t('SHORT_HELP_MSG');

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('HELP_MSG'))
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = handlerInput.t('HELP_MSG');

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const name = sessionAttributes['name'] ? sessionAttributes['name'] : '';

        const speechText = handlerInput.t('GOODBYE_MSG', {name: name});

        return handlerInput.responseBuilder
            .speak(speechText)
            .withShouldEndSession(true)
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speechText = handlerInput.t('FALLBACK_MSG');

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('HELP_MSG'))
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speechText = handlerInput.t('REFLECTOR_MSG', {intent: intentName});

        return handlerInput.responseBuilder
            .speak(speechText)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speechText = handlerInput.t('ERROR_MSG');

        console.log(`~~~~ Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('HELP_MSG'))
            .getResponse();
    }
};

module.exports = {
    LaunchRequestHandler,
    CelebrityBirthdaysIntentHandler,
    TouchIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
    ErrorHandler
}
