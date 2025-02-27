"use strict";

const logger = require("../../../logwrapper");

const eventManager = require("../../../events/EventManager");

const EVENT_SOURCE_ID = "streamloots";
const EventId = {
    PURCHASE: "purchase",
    REDEMPTION: "redemption"
};

const eventSourceDefinition = {
    id: EVENT_SOURCE_ID,
    name: "StreamLoots",
    description: "Purchase/Redemption events from StreamLoots",
    events: [
        {
            id: EventId.PURCHASE,
            name: "Chest Purchase",
            description: "When someone purchases or gifts chests.",
            cached: false,
            isIntegration: true
        },
        {
            id: EventId.REDEMPTION,
            name: "Card Redemption",
            description: "When someone redeems a card.",
            cached: false,
            isIntegration: true
        }
    ]
};

exports.registerEvents = () => {
    eventManager.registerEventSource(eventSourceDefinition);
};

function getFieldValue(fieldName, fields) {
    if (fields == null) {
        return null;
    }
    const field = fields.find(f => f.name === fieldName);
    return field ? field.value : null;
}

exports.processStreamLootsEvent = (eventData) => {

    logger.debug("Received StreamLoots event:", eventData);

    const metadata = {
        imageUrl: eventData.imageUrl,
        soundUrl: eventData.soundUrl
    };

    const streamlootsEventType = eventData.data.type;

    metadata.message = getFieldValue("message", eventData.data.fields);
    metadata.username = getFieldValue("username", eventData.data.fields);

    let eventId;
    if (streamlootsEventType === "purchase") {
        eventId = EventId.PURCHASE;

        const quantity = getFieldValue("quantity", eventData.data.fields);
        const giftee = getFieldValue("giftee", eventData.data.fields);

        metadata.quantity = quantity;
        metadata.giftee = giftee;

    } else if (streamlootsEventType === "redemption") {
        eventId = EventId.REDEMPTION;

        const cardRarity = getFieldValue("rarity", eventData.data.fields);
        metadata.cardRarity = cardRarity;
        metadata.cardName = eventData.data.cardName;
    }

    eventManager.triggerEvent(EVENT_SOURCE_ID, eventId, metadata);
};