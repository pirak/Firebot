"use strict";
(function() {
    const electron = require("electron");
    const shell = electron.shell;

    const profileManager = require("../../backend/common/profile-manager");
    const secrets = require("../../secrets.json");

    const moment = require("moment");
    moment.locale(electron.remote.app.getLocale());

    agGrid.initialiseAgGridWithAngular1(angular); // eslint-disable-line no-undef

    let app = angular.module("firebotApp", [
        "ngAnimate",
        "ngRoute",
        "ui.bootstrap",
        "rzModule",
        "ui.select",
        "ngSanitize",
        "ui.select",
        "ui.sortable",
        "ui.validate",
        "ebScrollLock",
        "summernote",
        "pascalprecht.translate",
        "ngToast",
        "agGrid",
        'ngYoutubeEmbed',
        'countUpModule',
        'pageslide-directive',
        'ui.bootstrap.contextMenu',
        'color.picker',
        'ngAria',
        'ui.codemirror'
    ]);

    app.factory("$exceptionHandler", function(logger) {
    // this catches angular exceptions so we can send it to winston
        return function(exception, cause) {
            console.log(exception || "", cause || {});
            logger.error(exception || "", cause || {});
        };
    });

    app.directive('focusOn', function() {
        return function(scope, elem, attr) {
            scope.$on('focusOn', function(e, name) {
                if (name === attr.focusOn) {
                    elem[0].focus();
                }
            });
        };
    });

    app.factory('focus', function ($rootScope, $timeout) {
        return function(name) {
            $timeout(function () {
                $rootScope.$broadcast('focusOn', name);
            });
        };
    });

    app.config([
        "$translateProvider",
        function($translateProvider) {
            $translateProvider
                .useStaticFilesLoader({
                    prefix: "lang/locale-",
                    suffix: ".json"
                })
                .preferredLanguage("en");
        }
    ]);

    app.config(function($sceDelegateProvider) {
        $sceDelegateProvider.resourceUrlWhitelist([
            'self',
            'https://kit.fontawesome.com/**'
        ]);
    });

    app.config([
        "ngToastProvider",
        function(ngToast) {
            ngToast.configure({
                verticalPosition: "top",
                horizontalPosition: "center",
                maxNumber: 5,
                timeout: 3000,
                className: "danger",
                animation: "fade",
                combineDuplications: true,
                dismissButton: true
            });
        }
    ]);

    app.run(function initializeApplication(
        logger,
        chatMessagesService,
        activityFeedService,
        viewerRolesService,
        connectionService,
        notificationService,
        $timeout,
        updatesService,
        commandsService,
        integrationService,
        viewersService,
        chatModerationService,
        ttsService,
        settingsService,
        countersService,
        gamesService,
        presetEffectListsService,
        startupScriptsService,
        effectQueuesService,
        timerService,
        channelRewardsService,
        sortTagsService,
        streamTagsService
    ) {
        // 'chatMessagesService' is included so its instantiated on app start

        connectionService.loadProfiles();

        //load viewer roles
        viewerRolesService.loadCustomRoles();

        //load commands
        commandsService.refreshCommands();

        timerService.loadTimers();

        //get integrations from backend
        integrationService.updateIntegrations();

        viewersService.updateViewers();

        chatModerationService.loadChatModerationData();

        countersService.loadCounters();

        gamesService.loadGames();

        presetEffectListsService.loadPresetEffectLists();

        startupScriptsService.loadStartupScripts();

        effectQueuesService.loadEffectQueues();

        channelRewardsService.loadChannelRewards();

        sortTagsService.loadSortTags();

        streamTagsService.loadAllStreamTags();

        //start notification check
        $timeout(() => {
            notificationService.loadAllNotifications();
            notificationService.startExternalIntervalCheck();
        }, 1000);

        //check for updates
        if (!updatesService.hasCheckedForUpdates) {
            updatesService.checkForUpdate();
        }

        ttsService.obtainVoices().then(() => {
            if (settingsService.getDefaultTtsVoiceId() == null) {
                settingsService.setDefaultTtsVoiceId(ttsService.getOsDefaultVoiceId());
            }
        });
    });

    app.controller("MainController", function($scope, $rootScope, $timeout, connectionService, utilityService,
        settingsService, sidebarManager, logger, backendCommunicator) {
        $rootScope.showSpinner = true;

        $scope.fontAwesome5KitUrl = `https://kit.fontawesome.com/${secrets.fontAwesome5KitId}.js`;

        $scope.sbm = sidebarManager;

        /**
         * rootScope functions. This means they are accessable in all scopes in the front end
         */
        $rootScope.pasteClipboard = function(elementId, shouldUnfocus) {
            angular.element(`#${elementId}`).focus();
            document.execCommand("paste");
            if (shouldUnfocus === true || shouldUnfocus == null) {
                angular.element(`#${elementId}`).blur();
            }
        };

        $rootScope.copyTextToClipboard = function(text) {
            let textArea = document.createElement("textarea");
            // Place in top-left corner of screen regardless of scroll position.
            textArea.style.position = "fixed";
            textArea.style.top = 0;
            textArea.style.left = 0;

            // Ensure it has a small width and height. Setting to 1px / 1em
            // doesn't work as this gives a negative w/h on some browsers.
            textArea.style.width = "2em";
            textArea.style.height = "2em";

            // We don't need padding, reducing the size if it does flash render.
            textArea.style.padding = 0;

            // Clean up any borders.
            textArea.style.border = "none";
            textArea.style.outline = "none";
            textArea.style.boxShadow = "none";

            // Avoid flash of white box if rendered for any reason.
            textArea.style.background = "transparent";

            textArea.value = text;

            document.body.appendChild(textArea);

            textArea.select();

            try {
                let successful = document.execCommand("copy");
                let msg = successful ? "successful" : "unsuccessful";
                logger.info("Copying text command was " + msg);
            } catch (err) {
                logger.error("Oops, unable to copy text to clipboard.");
            }

            document.body.removeChild(textArea);
        };

        $rootScope.openLinkExternally = function(url) {
            shell.openExternal(url);
        };

        /*
        * MANAGE LOGINS MODAL
        */
        $scope.showManageLoginsModal = function() {
            let showManageLoginsModal = {
                templateUrl: "manageLoginsModal.html",
                // This is the controller to be used for the modal.
                controllerFunc: ($scope, $uibModalInstance, connectionService) => {
                    $scope.cs = connectionService;

                    // Login Kickoff
                    $scope.loginOrLogout = function(type) {
                        connectionService.loginOrLogout(type);
                    };

                    $scope.getAccountAvatar = connectionService.getAccountAvatar;

                    $scope.close = function() {
                        $uibModalInstance.close();
                    };

                    // When they hit cancel or click outside the modal, we dont want to do anything
                    $scope.dismiss = function() {
                        $uibModalInstance.dismiss("cancel");
                    };
                }
            };
            utilityService.showModal(showManageLoginsModal);
        };

        /*
        * New Profile MODAL
        */
        $scope.showNewProfileModal = function() {
            let showNewProfileModal = {
                templateUrl: "newProfileModal.html",
                size: 'sm',
                // This is the controller to be used for the modal.
                controllerFunc: ($scope, $uibModalInstance, connectionService, ngToast) => {

                    // Login Kickoff
                    $scope.createNewProfile = function() {
                        if ($scope.profileName == null || $scope.profileName === "") {
                            ngToast.create("Please provide a profile name.");
                            return;
                        }
                        $uibModalInstance.close();
                        connectionService.createNewProfile($scope.profileName);
                    };

                    // When they hit cancel or click outside the modal, we dont want to do anything
                    $scope.dismiss = function() {
                        $uibModalInstance.dismiss("cancel");
                    };
                }
            };
            utilityService.showModal(showNewProfileModal);
        };

        /*
        * Rename Profile MODAL
        */
        $scope.showRenameProfileModal = function() {
            let renameProfileModal = {
                templateUrl: "renameProfileModal.html",
                size: 'sm',
                resolveObj: {
                    currentProfileId: () => profileManager.getLoggedInProfile()
                },
                // This is the controller to be used for the modal.
                controllerFunc: ($scope, $uibModalInstance, connectionService, ngToast, currentProfileId) => {

                    $scope.profileName = currentProfileId;

                    // Login Kickoff
                    $scope.renameProfile = function() {
                        if ($scope.profileName == null || $scope.profileName === "") {
                            ngToast.create("Please provide a profile name.");
                            return;
                        }
                        $uibModalInstance.close();
                        connectionService.renameProfile($scope.profileName);
                    };

                    // When they hit cancel or click outside the modal, we dont want to do anything
                    $scope.dismiss = function() {
                        $uibModalInstance.dismiss("cancel");
                    };
                }
            };
            utilityService.showModal(renameProfileModal);
        };



        /*
        * Delete Profile MODAL
        */
        $scope.showDeleteProfileModal = function() {
            let deleteProfileModal = {
                templateUrl: "deleteProfileModal.html",
                size: 'sm',
                // This is the controller to be used for the modal.
                controllerFunc: ($scope, $uibModalInstance, connectionService) => {
                    // Delete Profile
                    $scope.deleteProfile = function() {
                        $uibModalInstance.close();
                        connectionService.deleteProfile();
                    };

                    // When they hit cancel or click outside the modal, we dont want to do anything
                    $scope.dismiss = function() {
                        $uibModalInstance.dismiss("cancel");
                    };
                }
            };
            utilityService.showModal(deleteProfileModal);
        };

        // Switch Profiles
        $scope.switchProfiles = function(profileId) {
            if (profileId !== $scope.currentProfileId) {
                utilityService
                    .showConfirmationModal({
                        title: "Switch Profile",
                        question: "Switching profiles will cause the app to restart. Do you still want to switch profiles?",
                        confirmLabel: "Switch & Restart App",
                        confirmBtnType: "btn-info"
                    })
                    .then(confirmed => {
                        if (confirmed) {
                            connectionService.switchProfiles(profileId);
                        }
                    });
            }
        };

        $scope.currentProfileId = profileManager.getLoggedInProfile();

        /**
         * Initial App Load
         */
        $scope.cs = connectionService;
        //$scope.accounts = connectionService.accounts;
        //$scope.profiles = connectionService.profiles;

        if (settingsService.hasJustUpdated()) {
            utilityService.showUpdatedModal();
            settingsService.setJustUpdated(false);
        } else if (settingsService.isFirstTimeUse()) {
            utilityService.showSetupWizard();
            settingsService.setFirstTimeUse(false);
        }

        /**
         * Connection stuff
         */

        // Get app version and change titlebar.
        let appVersion = electron.remote.app.getVersion();
        $scope.appTitle = `Firebot v${appVersion}`;

        $scope.customFontCssPath = profileManager.getPathInProfile("/fonts/fonts.css");

        //make sure sliders render properly
        $timeout(function() {
            $scope.$broadcast("rzSliderForceRender");
        }, 250);

        // Apply Theme
        $scope.appTheme = function() {
            return settingsService.getTheme();
        };

        $rootScope.showSpinner = false;

        backendCommunicator.on("open-about-modal", () => {
            utilityService.showModal({
                component: "aboutModal",
                size: "sm",
                backdrop: true
            });
        });

        backendCommunicator.on("open-modal", (modalConfig) => {
            utilityService.showModal(modalConfig);
        });

        backendCommunicator.on("setup-opened", (path) => {
            utilityService.showModal({
                component: "importSetupModal",
                backdrop: false,
                resolveObj: {
                    setupFilePath: () => path
                }
            });
        });

        backendCommunicator.onAsync("takeScreenshot", async (data) => {

            const { desktopCapturer, remote } = require("electron");

            const screen = remote.screen;

            const displays = screen.getAllDisplays();

            const matchingDisplay = displays.find(d => d.id === data.displayId);

            const resolution = matchingDisplay ? {
                width: matchingDisplay.size.width * matchingDisplay.scaleFactor,
                height: matchingDisplay.size.height * matchingDisplay.scaleFactor
            } : {
                width: 1920,
                height: 1080
            };

            try {
                const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: resolution });

                const foundSource = sources.find(s => s.display_id.toString() === data.displayId.toString());

                if (foundSource) {
                    return foundSource.thumbnail.toDataURL();
                }
                return null;

            } catch (error) {
                logger.error("Failed to take screenshot", error);
                return null;
            }
        });

        //show puzzle
        /*utilityService.showModal({
            component: "puzzleModal",
            keyboard: false,
            backdrop: "static"
        });*/
    });

    // This adds a filter that we can use for ng-repeat, useful when we want to paginate something
    app.filter("startFrom", function() {
        return function(input, startFrom) {
            if (!input) {
                return input;
            }
            startFrom = +startFrom;
            return input.slice(startFrom);
        };
    });

    // This adds a filter that we can use for searching command triggers
    app.filter("triggerSearch", function() {
        return function(commands, query) {
            if (commands == null || query == null) {
                return commands;
            }
            return commands.filter(c =>
                c.trigger.toLowerCase().includes(query.toLowerCase())
            );
        };
    });


    app.filter("sortTagSearch", function() {
        return function(elements, tag) {
            if (elements == null || tag == null) {
                return elements;
            }
            return elements.filter(e => {
                if (tag.id === "none" && (e.sortTags == null || e.sortTags.length < 1)) {
                    return true;
                }
                return e.sortTags != null && e.sortTags.some(t => t === tag.id);
            }
            );
        };
    });

    app.filter("chatUserRole", function() {
        return function(users, role) {
            if (users == null || role == null) {
                return users;
            }
            return users.filter(u => {
                if (role === "broadcaster") {
                    return u.roles.includes("broadcaster");
                } else if (role === "viewer") {
                    return !u.roles.includes("broadcaster")
                        && !u.roles.includes("mod")
                        && !u.roles.includes("vip");
                } else if (role === "mod") {
                    return u.roles.includes("mod");
                } else if (role === "vip") {
                    return u.roles.includes("vip");
                }
                return true;
            }
            );
        };
    });


    // This adds a filter that we can use for searching variables
    app.filter("variableSearch", function() {
        return function(variables, query) {
            if (variables == null || query == null) {
                return variables;
            }
            let normalizedQuery = query.replace("$", "").toLowerCase();
            return variables
                .filter(v =>
                    v.handle.toLowerCase().includes(normalizedQuery)
                );
        };
    });

    // This adds a filter that we can use for searching effects
    app.filter("effectCategoryFilter", function() {
        return function(effects, category) {
            if (effects == null || category == null) {
                return effects;
            }
            return effects
                .filter(v =>
                    v.categories && v.categories.includes(category)
                );
        };
    });

    // This adds a filter that we can use for searching variables
    app.filter("variableCategoryFilter", function() {
        return function(variables, category) {
            if (variables == null || category == null) {
                return variables;
            }
            return variables
                .filter(v =>
                    v.categories && v.categories.includes(category)
                );
        };
    });

    app.filter('capitalize', function() {
        return function(input) {
            return (input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
        };
    });

    app.filter('prettyDate', function() {
        return function(input) {
            return (input) ? moment(input).format('L') : 'Not saved';
        };
    });

    app.filter('commify', function() {
        return function(input) {
            return input ? input.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
        };
    });
}(angular));
