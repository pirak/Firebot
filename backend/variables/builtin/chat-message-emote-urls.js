// Migration: info needed
"use strict";
const {
    EffectTrigger
} = require("../../effects/models/effectModels");

const { OutputDataType, VariableCategory } = require("../../../shared/variable-constants");

let triggers = {};
triggers[EffectTrigger.MANUAL] = true;
triggers[EffectTrigger.COMMAND] = true;
triggers[EffectTrigger.EVENT] = ["twitch:chat-message", "firebot:highlight-message"];

const model = {
    definition: {
        handle: "chatMessageEmoteUrls",
        examples: [
            {
                usage: "chatMessageEmoteUrls[1]",
                description: "Get the url of a specific emote."
            }
        ],
        description: "Outputs the urls of a chat message's emotes from the associated command or event.",
        triggers: triggers,
        categories: [VariableCategory.COMMON, VariableCategory.TRIGGER],
        possibleDataOutput: [OutputDataType.TEXT]
    },
    evaluator: (trigger, target = null) => {
        let messageParts = [];
        if (trigger.type === EffectTrigger.COMMAND) {
            messageParts = trigger.metadata.chatMessage.parts;
        } else if (trigger.type === EffectTrigger.EVENT) {
            messageParts = trigger.metadata.eventData.chatMessage.parts;
        }

        const emoteUrls = messageParts.filter(p => p.type === "emote").map(e => e.url);

        if (target != null) {
            return emoteUrls[target];
        }

        return emoteUrls;
    }
};

module.exports = model;
