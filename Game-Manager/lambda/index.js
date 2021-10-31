// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const util = require('./util'); // utility functions
// Get an instance of the persistence adapter
var persistenceAdapter = getPersistenceAdapter();

function levenshtein(a, b) {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  let tmp, i, j, prev, val, row
  // swap to save some memory O(min(a,b)) instead of O(a)
  if (a.length > b.length) {
    tmp = a
    a = b
    b = tmp
  }

  row = Array(a.length + 1)
  // init the row
  for (i = 0; i <= a.length; i++) {
    row[i] = i
  }

  // fill in the rest
  for (i = 1; i <= b.length; i++) {
    prev = i
    for (j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) {
        val = row[j-1] // match
      } else {
        val = Math.min(row[j-1] + 1, // substitution
              Math.min(prev + 1,     // insertion
                       row[j] + 1))  // deletion
      }
      row[j - 1] = prev
      prev = val
    }
    row[a.length] = prev
  }
  return row[a.length]
}

function getPersistenceAdapter(tableName) {
    // This function is an indirect way to detect if this is part of an Alexa-Hosted skill
    function isAlexaHosted() {
        return process.env.S3_PERSISTENCE_BUCKET;
    }
    if (isAlexaHosted()) {
        const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
        return new S3PersistenceAdapter({
            bucketName: process.env.S3_PERSISTENCE_BUCKET
        });
    } else {
        // IMPORTANT: don't forget to give DynamoDB access to the role you're using to run this lambda (via IAM policy)
        const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
        return new DynamoDbPersistenceAdapter({
            tableName: tableName || 'player_score',
            createTable: true
        });
    }
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        const playerOneName = sessionAttributes['playerOneName'];
        const playerTwoName = sessionAttributes['playerTwoName'];
        const playerThreeName = sessionAttributes['playerThreeName'];
        const playerFourName = sessionAttributes['playerFourName'];
        
        
        const playerOneScore = sessionAttributes.hasOwnProperty('playerOneScore')? sessionAttributes['playerOneScore'] : 0;
        const playerTwoScore = sessionAttributes.hasOwnProperty('playerTwoScore')? sessionAttributes['playerTwoScore'] : 0;
        const playerThreeScore = sessionAttributes.hasOwnProperty('playerThreeScore')? sessionAttributes['playerThreeScore'] : 0;
        const playerFourScore = sessionAttributes.hasOwnProperty('playerFourScore')? sessionAttributes['playerFourScore'] : 0;

        const playersAvailable = playerOneName && playerTwoName;
        
        if (playersAvailable){
            // we can't use intent chaining because the target intent is not dialog based
            var speakOutput = `Welcome ${playerOneName} and ${playerTwoName}.`;
            var headerNames = `${playerOneName} and ${playerTwoName}`
            if(playerThreeName){
                speakOutput = `Welcome ${playerOneName}, ${playerTwoName}, and ${playerThreeName}.`;
                headerNames = `${playerOneName} ${playerTwoName} and ${playerThreeName}`;
            }
            if(playerFourName){
                speakOutput = `Welcome ${playerOneName}, ${playerTwoName}, ${playerThreeName}, and ${playerFourName}.`;
                headerNames = `${playerOneName} ${playerTwoName} ${playerThreeName} and ${playerFourName}`;
            }            

            // Add APL directive to response
            if (util.supportsAPL(handlerInput)) {
                handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    document: util.APL.launchDoc,
                    datasources: {
                        headlineData: {
                            type: "AlexaHeadline",
                            primaryText: `Welcome to Game Manager!`,
                            footerHintText: `Alexa, add 5 points to ${playerOneName}`,
                            headerAttributionImage: 'https://s3.amazonaws.com/ask-skills-assets/apl-layout-assets/attribution_dark_hub_prime.png',
                            headerTitle: `${headerNames}`
                        }
                    }
                });
            }
        
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(false)
                .getResponse();
        }
        
        const speakOutput1 = 'Welcome to Score Keeper!';
   
        // we use intent chaining to trigger the player name registration multi-turn
        return handlerInput.responseBuilder
            .speak(speakOutput1)
            // we use intent chaining to trigger the player name registration multi-turn
            .addDelegateDirective({
                name: 'NumberOfPlayersIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })        
            .getResponse();
    }

};
const NumberOfPlayersIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NumberOfPlayersIntent';
    },
    handle(handlerInput){
        const {attributesManager, requestEnvelope} = handlerInput;
        // the attributes manager allows us to access session attributes
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = requestEnvelope.request;
        
        const numplayer = Number(Alexa.getSlotValue(requestEnvelope, 'numplayer'));
        sessionAttributes['numplayer'] = numplayer;
        
        if (numplayer === 2){
            return handlerInput.responseBuilder
            .speak('two players?')
            // we use intent chaining to trigger the player name registration multi-turn
            .addDelegateDirective({
                name: 'SetTwoPlayerNamesIntent',
                confirmationStatus: 'NONE',
                slots: {
                    numplayer: {
                        name: 'numplayer',
                        value: numplayer,
                        confirmationStatus: 'NONE',
                        source: 'USER'
                    },
                    playerOne: {
                        name: 'playerOne',
                        confirmationStatus: 'NONE',
                    },
                    playerTwo: {
                        name: 'playerTwo',
                        confirmationStatus: 'NONE',
                    }
                }
            })        
            .getResponse();
        }
        else if (numplayer === 3){
            return handlerInput.responseBuilder
            .speak('three players')
            // we use intent chaining to trigger the player name registration multi-turn
            .addDelegateDirective({
                name: 'SetThreePlayerNamesIntent',
                confirmationStatus: 'NONE',
                slots: {
                    numplayer: {
                        name: 'numplayer',
                        value: numplayer,
                        confirmationStatus: 'NONE',
                        source: 'USER'
                    }
                }
            })        
            .getResponse();
        }
        else if (numplayer === 4){
            return handlerInput.responseBuilder
            // we use intent chaining to trigger the player name registration multi-turn
            .addDelegateDirective({
                name: 'SetFourPlayerNamesIntent',
                confirmationStatus: 'NONE',
                slots: {
                    numplayer: {
                        name: 'numplayer',
                        value: numplayer,
                        confirmationStatus: 'NONE',
                        source: 'USER'
                    }
                }
            })        
            .getResponse();
        }
        else{
            return handlerInput.responseBuilder
            // we use intent chaining to trigger the player name registration multi-turn
            .speak('this is not working. rip')       
            .getResponse();           
        }
    }
}

const CheckPlayerStatusIntentHandler = {
    canHandle(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        const playersSet = sessionAttributes.hasOwnProperty('playerOneName') || sessionAttributes.hasOwnProperty('playerTwoName') || sessionAttributes.hasOwnProperty('playerThreeName') || sessionAttributes.hasOwnProperty('playerFourName');

        return Alexa.getRequestType(requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(requestEnvelope) === 'SetTwoPlayerNamesIntent' ||
                Alexa.getIntentName(requestEnvelope) === 'SetThreePlayerNamesIntent' ||
                Alexa.getIntentName(requestEnvelope) === 'SetFourPlayerNamesIntent' ||
                Alexa.getIntentName(requestEnvelope) === 'NumberOfPlayersIntent' )
            && playersSet;
    },
    handle(handlerInput) {

        return handlerInput.responseBuilder
            .speak('Game is already in progress')
            .getResponse();        
        
    }
}

const SetTwoPlayerNamesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetTwoPlayerNamesIntent'
    },
    handle(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        // the attributes manager allows us to access session attributes
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = requestEnvelope.request;

        if (intent.confirmationStatus === 'CONFIRMED') {
    
            const playerOneName = Alexa.getSlotValue(requestEnvelope, 'playerOne');
            const playerTwoName = Alexa.getSlotValue(requestEnvelope, 'playerTwo');

            sessionAttributes['playerOneName'] = playerOneName;
            sessionAttributes['playerTwoName'] = playerTwoName;
            sessionAttributes['playerOneScore'] = 0;
            sessionAttributes['playerTwoScore'] = 0;

            const speakOutput = `Welcome ${playerOneName} and ${playerTwoName}.`;

            return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
        }
        
        return handlerInput.responseBuilder
            .speak('I did not understand the names, say them again.')
            .reprompt('What are the names of the 2 players?')
            .getResponse();
    }
};

const SetThreePlayerNamesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetThreePlayerNamesIntent';
    },
    handle(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        // the attributes manager allows us to access session attributes
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = requestEnvelope.request;

        if (intent.confirmationStatus === 'CONFIRMED') {
    
            const playerOneName = Alexa.getSlotValue(requestEnvelope, 'playerOne');
            const playerTwoName = Alexa.getSlotValue(requestEnvelope, 'playerTwo');
            const playerThreeName = Alexa.getSlotValue(requestEnvelope, 'playerThree');

            sessionAttributes['playerOneName'] = playerOneName;
            sessionAttributes['playerTwoName'] = playerTwoName;
            sessionAttributes['playerOneScore'] = 0;
            sessionAttributes['playerTwoScore'] = 0;
            sessionAttributes['playerThreeName'] = playerThreeName;
            sessionAttributes['playerThreeScore'] = 0;

            const speakOutput = `Welcome ${playerOneName}, ${playerTwoName}, and ${playerThreeName}.`;

            return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
        }
        
        return handlerInput.responseBuilder
            .speak('I did not understand the names, say them again.')
            .reprompt('What are the names of the 3 players?')
            .getResponse();
    }
};
const SetFourPlayerNamesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetFourPlayerNamesIntent';
    },
    handle(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        // the attributes manager allows us to access session attributes
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = requestEnvelope.request;

        if (intent.confirmationStatus === 'CONFIRMED') {
    
            const playerOneName = Alexa.getSlotValue(requestEnvelope, 'playerOne');
            const playerTwoName = Alexa.getSlotValue(requestEnvelope, 'playerTwo');
            const playerThreeName = Alexa.getSlotValue(requestEnvelope, 'playerThree');
            const playerFourName = Alexa.getSlotValue(requestEnvelope, 'playerFour');

            sessionAttributes['playerOneName'] = playerOneName;
            sessionAttributes['playerTwoName'] = playerTwoName;
            sessionAttributes['playerOneScore'] = 0;
            sessionAttributes['playerTwoScore'] = 0;
            sessionAttributes['playerThreeName'] = playerThreeName;
            sessionAttributes['playerThreeScore'] = 0;
            sessionAttributes['playerFourName'] = playerFourName;
            sessionAttributes['playerFourScore'] = 0;
            const speakOutput = `Welcome ${playerOneName}, ${playerTwoName}, ${playerThreeName}, and ${playerFourName}.`;

            return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
        }
        
        return handlerInput.responseBuilder
            .speak('I did not understand the names, say them again')
            .reprompt('What are the names of 4 the players?')
            .getResponse();
    }
};



const PointsManagerIntentHandler = {
    canHandle(handlerInput){
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PointsManagerIntent'
    },
    handle(handlerInput){
        
        const {attributesManager, requestEnvelope} = handlerInput;
        // the attributes manager allows us to access session attributes
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = requestEnvelope.request;
        
        
        const playerOneName = sessionAttributes['playerOneName'];
        const playerTwoName = sessionAttributes['playerTwoName'];
        const playerThreeName = sessionAttributes['playerThreeName'];
        const playerFourName = sessionAttributes['playerFourName']; 
        
        var playerOneScore = sessionAttributes.hasOwnProperty('playerOneScore')? sessionAttributes['playerOneScore'] : 0;
        var playerTwoScore = sessionAttributes.hasOwnProperty('playerTwoScore')? sessionAttributes['playerTwoScore'] : 0;
        var playerThreeScore = sessionAttributes.hasOwnProperty('playerThreeScore')? sessionAttributes['playerThreeScore'] : 0;
        var playerFourScore = sessionAttributes.hasOwnProperty('playerFourScore')? sessionAttributes['playerFourScore'] : 0;
        
        var temp_players = 3;
        if(playerOneName && playerTwoName && playerThreeName && playerFourName){
            temp_players = 1;
        }
        else if (playerOneName && playerTwoName && playerThreeName){
            temp_players = 2;
        }
        else{
            temp_players = 3;
        }
        
        
        
        const playersAvailable = playerOneName && playerTwoName;
        
        
        if (playersAvailable && intent.confirmationStatus === 'CONFIRMED') {
            var playerName = String(Alexa.getSlotValue(requestEnvelope, 'playerName'));
            var points = Number(Alexa.getSlotValue(requestEnvelope, 'points'));
            const action = Alexa.getSlotValue(requestEnvelope, 'action');
            if(action === 'subtract'){
                points = points * -1
            }
        
            if(!(playerName === playerOneName || playerName === playerTwoName || playerName === playerThreeName || playerName === playerFourName))
            {
                const distOne = levenshtein(playerName, playerOneName);
                const distTwo = levenshtein(playerName, playerTwoName);
                const distThree = sessionAttributes.hasOwnProperty('playerThreeName')? levenshtein(playerName, playerThreeName) : 100;
                const distFour = sessionAttributes.hasOwnProperty('playerFourName')? levenshtein(playerName, playerFourName) : 100;
                
                var bestName = playerOneName;
                var bestDist = distOne;

                if(distTwo < bestDist) {
                    bestName = playerTwoName;
                    bestDist = distTwo;
                }
                
                if(distThree < bestDist) {
                    bestName = playerThreeName;
                    bestDist = distThree;
                }
                
                if(distTwo < bestDist) {
                    bestName = playerFourName;
                    bestDist = distFour;
                }
                
                if(bestDist < 3) {
                    playerName = bestName;
                }
            }
            
            if(playerName === playerOneName) {
                playerOneScore += points;
                sessionAttributes['playerOneScore'] = playerOneScore;
            }
            else if(playerName === playerTwoName) {
                playerTwoScore += points;
                sessionAttributes['playerTwoScore'] = playerTwoScore;
            }
            else if(playerName === playerThreeName) {
                playerThreeScore += points;
                sessionAttributes['playerThreeScore'] = playerThreeScore;
            }
            else if(playerName === playerFourName) {
                playerFourScore += points;
                sessionAttributes['playerFourScore'] = playerFourScore;
            }
            else{
                return handlerInput.responseBuilder
                    .speak(`${playerName} is not a player in this game`)
                    .getResponse();
            }
            
            var speakOutput = `${playerOneName} has ${playerOneScore} points and ${playerTwoName} has ${playerTwoScore} points`
            if (playerThreeName) {
                speakOutput = `${playerOneName} has ${playerOneScore} points, ${playerTwoName} has ${playerTwoScore} points, and ${playerThreeName} has ${playerThreeScore} points`
            }
            if (playerFourName){
                speakOutput = `${playerOneName} has ${playerOneScore} points, ${playerTwoName} has ${playerTwoScore} points, ${playerThreeName} has ${playerThreeScore} points, and ${playerFourName} has ${playerFourScore} points`
            }
            if (util.supportsAPL(handlerInput) && temp_players === 3) {
                handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    document: util.APL.pointsDoc,
                    datasources: {
                        textListData: {
                            headerTitle: "Game Manager",
                            headerSubtitle: `Two Players`,
                            headerAttributionImage: "https://s3.amazonaws.com/ask-skills-assets/apl-layout-assets/attribution_dark_hub_prime.png",
                            backgroundImageSource: "https://d2o906d8ln7ui1.cloudfront.net/images/BT6_Background.png",
                            listItemsToShow: [
                             {
                                type: "AlexaTextListItem",
                                primaryText: `${playerOneName}: ${playerOneScore} points`,
                                secondaryText: "hello ",
                                secondaryTextPosition: "bottom",
                                tertiaryText: "This is the tertiary text",
                                tertiaryTextPosition: "bottom",
                                ratingNumber: 2,
                                imageThumbnailSource: "https://d2o906d8ln7ui1.cloudfront.net/images/md_brie.png"
                              },
                              {
                                type: "AlexaTextListItem",
                                primaryText: `${playerTwoName}: ${playerTwoScore} points`,
                                secondaryText: `5`,
                                imageThumbnailSource: "https://d2o906d8ln7ui1.cloudfront.net/images/md_gruyere.png",
                                tertiaryText: "Tertiary text",
                                tertiaryTextPosition: "bottom",
                                ratingNumber: 0
                              }
                            ]
                        }
                    }
                });
            }
            else if (util.supportsAPL(handlerInput) && temp_players === 2) {
                handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    document: util.APL.pointsDoc,
                    datasources: {
                        textListData: {
                            headerTitle: "Game Manager",
                            headerSubtitle: `Three Players`,
                            headerAttributionImage: "https://s3.amazonaws.com/ask-skills-assets/apl-layout-assets/attribution_dark_hub_prime.png",
                            backgroundImageSource: "https://d2o906d8ln7ui1.cloudfront.net/images/BT6_Background.png",
                            listItemsToShow: [
                             {
                                type: "AlexaTextListItem",
                                primaryText: `${playerOneName}: ${playerOneScore} points`,
                                secondaryText: "hello ",
                                secondaryTextPosition: "bottom",
                                tertiaryText: "This is the tertiary text",
                                tertiaryTextPosition: "bottom",
                                ratingNumber: 2,
                                imageThumbnailSource: "https://d2o906d8ln7ui1.cloudfront.net/images/md_brie.png"
                              },
                              {
                                type: "AlexaTextListItem",
                                primaryText: `${playerTwoName}: ${playerTwoScore} points`,
                                secondaryText: `5`,
                                imageThumbnailSource: "https://d2o906d8ln7ui1.cloudfront.net/images/md_gruyere.png",
                                tertiaryText: "Tertiary text",
                                tertiaryTextPosition: "bottom",
                                ratingNumber: 0
                              },
                              {
                                type: "AlexaTextListItem",
                                primaryText: `${playerThreeName}: ${playerThreeScore} points`,
                                secondaryText: `5`,
                                imageThumbnailSource: "https://d2o906d8ln7ui1.cloudfront.net/images/md_gruyere.png",
                                tertiaryText: "Tertiary text",
                                tertiaryTextPosition: "bottom",
                                ratingNumber: 0
                              }
                            ]

                        }
                    }
                });
            }
            
            
            
            //(util.supportsAPL(handlerInput) && temp_players === 1)
            else  {
                handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    document: util.APL.pointsDoc,
                    datasources: {
                        textListData: {
                            headerTitle: "Game Manager",
                            headerSubtitle: `Four Players`,
                            headerAttributionImage: "https://s3.amazonaws.com/ask-skills-assets/apl-layout-assets/attribution_dark_hub_prime.png",
                            //backgroundImageSource: "https://d2o906d8ln7ui1.cloudfront.net/images/BT6_Background.png",
                            listItemsToShow: [
                             {
                                type: "AlexaTextListItem",
                                primaryText: `${playerOneName}: ${playerOneScore} points`,
                                secondaryText: "hello ",
                                secondaryTextPosition: "bottom",
                                tertiaryText: "This is the tertiary text",
                                tertiaryTextPosition: "bottom",
                                ratingNumber: 2,
                                imageThumbnailSource: "https://d2o906d8ln7ui1.cloudfront.net/images/md_brie.png"
                              },
                              {
                                type: "AlexaTextListItem",
                                primaryText: `${playerTwoName}: ${playerTwoScore} points`,
                                secondaryText: `5`,
                                imageThumbnailSource: "https://d2o906d8ln7ui1.cloudfront.net/images/md_gruyere.png",
                                tertiaryText: "Tertiary text",
                                tertiaryTextPosition: "bottom",
                                ratingNumber: 0
                              },
                              {
                                type: "AlexaTextListItem",
                                primaryText: `${playerThreeName}: ${playerThreeScore} points`,
                                secondaryText: `5`,
                                imageThumbnailSource: "https://d2o906d8ln7ui1.cloudfront.net/images/md_gruyere.png",
                                tertiaryText: "Tertiary text",
                                tertiaryTextPosition: "bottom",
                                ratingNumber: 0
                              },
                              {
                                type: "AlexaTextListItem",
                                primaryText: `${playerFourName}: ${playerFourScore} points`,
                                secondaryText: `5`,
                                imageThumbnailSource: "https://d2o906d8ln7ui1.cloudfront.net/images/md_gruyere.png",
                                tertiaryText: "Tertiary text",
                                tertiaryTextPosition: "bottom",
                                ratingNumber: 0
                              }
                            ]
                        }
                    }
                });
            }
            
            
            
            
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        }
    
        return handlerInput.responseBuilder
            .speak('I did not understand the request')
            .reprompt('Say something?')
            .getResponse();
        
    }
};

const ResetScoresIntentHandler = {
    canHandle(handlerInput){
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ResetScoresIntent'
    },
    handle(handlerInput){
        const {attributesManager, requestEnvelope} = handlerInput;
        // the attributes manager allows us to access session attributes
        attributesManager.setSessionAttributes({});
        const sessionAttributes = attributesManager.getSessionAttributes();
        sessionAttributes['loaded'] = true;
        
        
        const speakOutput = `The scores and names are reset, a new game has started.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            
            .addDelegateDirective({
                name: 'NumberOfPlayersIntent',
                confirmationStatus: 'NONE',
                slots: {}        
            })
            .getResponse();
    }    
}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interSetPlayerNames model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
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
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// This request interceptor will log all incoming requests to this lambda
const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    }
};

// This response interceptor will log all outgoing responses of this lambda
const LoggingResponseInterceptor = {
    process(handlerInput, response) {
        console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
};

/* *
 * Below we use async and await ( more info: javascript.info/async-await )
 * It's a way to wrap promises and waait for the result of an external async operation
 * Like getting and saving the persistent attributes
 * */
const LoadAttributesRequestInterceptor = {
    async process(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        // the "loaded" check is because the "new" session flag is lost if there's a one shot utterance that hits an intent with auto-delegate
        if (Alexa.isNewSession(requestEnvelope) || !sessionAttributes['loaded']){ //is this a new session? not loaded from db?
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            console.log('Loading from persistent storage: ' + JSON.stringify(persistentAttributes));
            persistentAttributes['loaded'] = true;
            //copy persistent attribute to session attributes
            attributesManager.setSessionAttributes(persistentAttributes); // ALL persistent attributtes are now session attributes
        }
    }
};

// If you disable the skill and reenable it the userId might change and you loose the persistent attributes saved below as userId is the primary key
const SaveAttributesResponseInterceptor = {
    async process(handlerInput, response) {
        if (!response) return; // avoid intercepting calls that have no outgoing response due to errors
        const {attributesManager, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession); //is this a session end?
        // the "loaded" check is because the session "new" flag is lost if there's a one shot utterance that hits an intent with auto-delegate
        const loadedThisSession = sessionAttributes['loaded'];
        if ((shouldEndSession || Alexa.getRequestType(requestEnvelope) === 'SessionEndedRequest') && loadedThisSession) { // skill was stopped or timed out
            // we increment a persistent session counter here
            sessionAttributes['sessionCounter'] = sessionAttributes['sessionCounter'] ? sessionAttributes['sessionCounter'] + 1 : 1;
            // limiting save of session attributes to the ones we want to make persistent

            console.log('Saving to persistent storage:' + JSON.stringify(sessionAttributes));
            attributesManager.setPersistentAttributes(sessionAttributes);
            await attributesManager.savePersistentAttributes();
        }
    }
};


// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CheckPlayerStatusIntentHandler,
        NumberOfPlayersIntentHandler,
        SetTwoPlayerNamesIntentHandler,
        SetThreePlayerNamesIntentHandler,
        SetFourPlayerNamesIntentHandler,
        PointsManagerIntentHandler,
        ResetScoresIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        LoggingRequestInterceptor,
        LoadAttributesRequestInterceptor)
    .addResponseInterceptors(
        LoggingResponseInterceptor,
        SaveAttributesResponseInterceptor)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda();
