"use strict";

let EventEmitter = require("events");
const logger = require("./logwrapper");
const { settings } = require("./common/settings-access");
const simpleOauthModule = require('simple-oauth2');

const HTTP_PORT = settings.getWebServerPort();

class AuthManager extends EventEmitter {
    constructor() {
        super();
        this._authProviders = [];

        this.REDIRECT_URI = 'http://localhost:' + HTTP_PORT + '/api/v1/auth/callback';
    }

    registerAuthProvider(authProviderDetails) {
        if (authProviderDetails == null) return;

        const oauthClient = this.buildOAuthClientForProvider(authProviderDetails);

        const authorizationUri = oauthClient.authorizationCode.authorizeURL({
            redirect_uri: this.REDIRECT_URI, //eslint-disable-line camelcase
            scope: authProviderDetails.scopes || '',
            state: authProviderDetails.id
        });

        const authProvider = {
            id: authProviderDetails.id,
            oauthClient: oauthClient,
            authorizationUri: authorizationUri,
            details: authProviderDetails
        };

        this._authProviders.push(authProvider);

        logger.debug(`Registered Auth Provider ${authProviderDetails.name}`);
    }

    getAuthProvider(providerId) {
        return this._authProviders.find(p => p.id === providerId);
    }

    buildOAuthClientForProvider(provider) {
        return simpleOauthModule.create({
            client: provider.client,
            auth: provider.auth,
            options: {
                authorizationMethod: "body"
            }
        });
    }

    async refreshTokenIfExpired(providerId, tokenData) {
        const provider = this.getAuthProvider(providerId);
        let accessToken = provider.oauthClient.accessToken.create(tokenData);

        if (accessToken.expired()) {
            try {
                const params = {
                    scope: provider.details.scopes
                };

                accessToken = await accessToken.refresh(params);
            } catch (error) {
                logger.warn('Error refreshing access token: ', error);
                return null;
            }
        }
        return accessToken.token;
    }

    successfulAuth(providerId, tokenData) {
        this.emit("auth-success", { providerId: providerId, tokenData: tokenData });
    }
}


/*
example auth provider details:
{
    id: "firebot:mixer:streamer",
    name: "Mixer Streamer Account",
    client: {
        id: 'c22379f1a0ea851c805005b1b0c97ffd940794d61a73b366' // mixer oauth client ID here
    },
    auth: {
        tokenHost: 'https://mixer.com',
        tokenPath: '/api/v1/oauth/token',
        authorizePath: '/oauth/authorize'
    },
    scope: ''
}

*/

const manager = new AuthManager();

module.exports = manager;