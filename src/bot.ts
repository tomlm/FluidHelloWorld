import { IGetContainerService, TinyliciousService } from "@fluid-experimental/get-container";
import { Fluid } from '@fluid-experimental/fluid-static';
import { DiceApp } from "./DiceApp";
import * as restify from 'restify';
// require('dotenv').config();
import { ActivityTypes, BotFrameworkAdapter, MessageFactory, StatusCodes, WebRequest, WebResponse } from 'botbuilder';
import { ActionContentType, AdaptiveCardAction, AdaptiveCardContentType } from './card';

// create http server
const server = restify.createServer();

// listen on port
server.listen(process.env.port || process.env.PORT || 3978, () => console.log(`\n${server.name} listening to ${server.url}`));

// adapter to use for validating requests.
const adapter = new BotFrameworkAdapter({ appId: process.env.MicrosoftAppId, appPassword: process.env.MicrosoftAppPassword });

// create fluid service reference
const service = new TinyliciousService();

// endpoint for invoke activity POST back for card actions
server.post('/api/messages', (req: WebRequest, res: WebResponse) => {

    adapter.processActivity(req, res, async (context) => {
        if (context.activity.type == ActivityTypes.Invoke && context.activity.name == ActionContentType) {
            // action payload from the card
            let action = <AdaptiveCardAction>context.activity.value.action;

            // get the container
            var fluidContainer = await getFluidContainer(service, <string>action.id);

            // get the app
            let diceApp = await fluidContainer.getDataObject('kvpairId');

            // invoke the action logic
            let updatedCard = await diceApp.onAction(action);

            // send updated card
            await context.sendActivity({ type: "invokeResponse", value: { status: StatusCodes.OK, body: { statusCode: StatusCodes.OK, type: AdaptiveCardContentType, data: updatedCard } } });
        }
        else if (context.activity.type == ActivityTypes.Message) {
            if (context.activity.text.indexOf("localhost:8080/#") > 0) {
                let index = context.activity.text.indexOf('#') + 1;
                let id = context.activity.text.substring(index);

                // get the container
                var fluidContainer = await getFluidContainer(service, id);

                // get the app 
                let diceApp = await fluidContainer.getDataObject('kvpairId');

                // disconnect;
                fluidContainer["container"].kill

                // invoke the action logic
                let updatedCard = await diceApp.GetCard();

                // send card
                let activity = MessageFactory.attachment({
                    contentType: AdaptiveCardContentType,
                    content: updatedCard
                }, id);
                await context.sendActivity(activity);
            }
        }
    });
});


async function getFluidContainer(service: IGetContainerService, id: string) {
    var fluidContainer = await Fluid.getContainer(service, <string>id, [DiceApp]);

    await (new Promise<void>(((resolve) => {
        fluidContainer["container"].once("connected", () => resolve());
    })));
    return fluidContainer;
}

// server.post('/dicevalue', async (req: WebRequest, res: WebResponse) => {

//             // action payload from the card

//             // get the app
//             var fluidContainer = await Fluid.getContainer(service, <string>"1616437348015", [DiceApp]);
//             let diceApp = (await fluidContainer.getDataObject('kvpairId')) as DiceApp;
//             res.status(200);
//             console.log(`----------------------------------------`)
//             console.log(diceApp.DiceValue);
//             return res.send(diceApp.DiceValue);

// });
