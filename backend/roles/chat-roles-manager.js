"use strict";

const twitchApi = require("../twitch-api/api");
const accountAccess = require("../common/account-access");
const logger = require("../logwrapper");

/** @type {string[]} */
let vips = [];

/**
 * @param {string[]} usersInVipRole
 * @return {void}
 */
const loadUsersInVipRole = (usersInVipRole) => {
    vips = usersInVipRole;
};

/**
 * @param {string} username
 * @return {void}
 */
const addVipToVipList = (username) => {
    vips.push(username);
};

/**
 * @param {string} username
 * @return {void}
 */
const removeVipFromVipList = (username) => {
    vips = vips.filter(vip => vip !== username);
};

/**
 * @param {string} userIdOrName
 * @returns {Promise<string>}
 */
const getUserSubscriberRole = async (userIdOrName) => {
    const isName = isNaN(userIdOrName);

    const client = twitchApi.getClient();
    const userId = isName ? (await client.users.getUserByName(userIdOrName)).id : userIdOrName;

    const streamer = accountAccess.getAccounts().streamer;
    const subInfo = await client.subscriptions.getSubscriptionForUser(streamer.userId, userId);

    if (subInfo == null || subInfo.tier == null) {
        return null;
    }

    let role = '';
    switch (subInfo.tier) {
    case "1000":
        role = "tier1";
        break;
    case "2000":
        role = "tier2";
        break;
    case "3000":
        role = "tier3";
        break;
    }

    return role;
};

/**
 * @param {string} [userIdOrName]
 * @returns {Promise<string[]>}
 */
const getUsersChatRoles = async (userIdOrName = "") => {
    userIdOrName = userIdOrName.toLowerCase();
    const isName = isNaN(userIdOrName);

    const roles = [];

    try {
        const client = twitchApi.getClient();
        const username = isName ? userIdOrName : (await client.users.getUserById(userIdOrName)).name;

        const streamer = accountAccess.getAccounts().streamer;
        if (!userIdOrName || userIdOrName === streamer.userId || userIdOrName === streamer.username) {
            roles.push("broadcaster");
        }

        if (streamer.broadcasterType !== "") {
            const subscriberRole = await getUserSubscriberRole(userIdOrName);
            if (subscriberRole != null) {
                roles.push("sub");
                roles.push(subscriberRole);
            }
        }

        if (vips.some(v => v === username)) {
            roles.push("vip");
        }

        const moderators = (await client.moderation.getModerators(streamer.userId)).data;
        if (moderators.some(m => m.userName === username)) {
            roles.push("mod");
        }

        return roles;
    } catch (err) {
        logger.error("Failed to get user chat roles", err);
        return [];
    }
};

exports.loadUsersInVipRole = loadUsersInVipRole;
exports.addVipToVipList = addVipToVipList;
exports.removeVipFromVipList = removeVipFromVipList;
exports.getUsersChatRoles = getUsersChatRoles;