const ColorConsole = require('../../services/ColorConsole');
const ApiClient = require('./ApiClient');

class TestRail {
    /**
     *
     * @param domain
     * @param username
     * @param password
     * @param isScreenshotsEnabled
     */
    constructor(domain, username, password, isScreenshotsEnabled) {
        this.client = new ApiClient(domain, username, password);
        this.isScreenshotsEnabled = isScreenshotsEnabled;
    }

    /**
     *
     * @param planId
     * @returns {Promise<*>}
     */
    async getPlan(planId) {
        return this.client.getData('/get_plan/' + planId);
    }

    /**
     *
     * @param planId
     * @param description
     * @returns {Promise<*>}
     */
    async updatePlan(planId, description) {
        const postData = {
            description: description,
        };

        return this.client.sendData(
            '/update_plan/' + planId,
            postData,
            () => {
                ColorConsole.success('  TestPlan updated in TestRail');
            },
            (statusCode, statusText, errorText) => {
                ColorConsole.error('  Could not update TestRail plan for plan ID ' + planId + ': ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.debug('');
            }
        );
    }

    /**
     *
     * @param projectId
     * @param milestoneId
     * @param suiteId
     * @param name
     * @param description
     * @param callback
     * @returns {Promise<AxiosResponse<*>>}
     */
    createRun(projectId, milestoneId, suiteId, name, description, callback) {
        const postData = {
            name: name,
            description: description,
            include_all: false,
            case_ids: [],
        };

        if (milestoneId !== '') {
            postData['milestone_id'] = milestoneId;
        }

        if (suiteId !== '') {
            postData['suite_id'] = suiteId;
        }

        return this.client.sendData(
            '/add_run/' + projectId,
            postData,
            (response) => {
                ColorConsole.success('  TestRun created in TestRail: ' + name);
                // notify our callback
                callback(response.data.id);
            },
            (statusCode, statusText, errorText) => {
                ColorConsole.error('  Could not create TestRail run for project P' + projectId + ': ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.debug('');
            }
        );
    }

    /**
     *
     * @param runId
     * @param caseIds
     * @returns {Promise<AxiosResponse<any>>}
     */
    updateRun(runId, caseIds) {
        const postData = {
            include_all: false,
            case_ids: caseIds,
        };

        return this.client.sendData(
            '/update_run/' + runId,
            postData,
            () => {
                ColorConsole.success('  TestRun updated in TestRail: ' + runId);
            },
            (statusCode, statusText, errorText) => {
                ColorConsole.error('  Could not add TestRail test cases to run R' + runId + ': ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.debug('');
            }
        );
    }

    /**
     *
     * @param runId
     * @param onSuccess
     */
    closeRun(runId, onSuccess) {
        return this.client.sendData(
            '/close_run/' + runId,
            {},
            () => {
                onSuccess();
            },
            (statusCode, statusText, errorText) => {
                ColorConsole.error('  Could not close TestRail run R' + runId + ': ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.debug('');
            }
        );
    }

    /**
     *
     * @param runID
     * @param result
     */
    sendResult(runID, result) {
        const postData = {
            results: [
                {
                    case_id: result.getCaseId(),
                    status_id: result.getStatusId(),
                    comment: result.getComment().trim(),
                },
            ],
        };

        // 0s is not valid
        if (result.getElapsed() !== '0s') {
            postData.results[0].elapsed = result.getElapsed();
        }

        return this.client.sendData(
            '/add_results_for_cases/' + runID,
            postData,
            (response) => {
                const resultId = response.data[0].id;

                ColorConsole.success('  TestRail result ' + resultId + ' sent for TestCase C' + result.getCaseId());

                if (this.isScreenshotsEnabled && result.getScreenshotPath() !== null && result.getScreenshotPath() !== '') {
                    ColorConsole.debug('    sending screenshot to TestRail for TestCase C' + result.getCaseId());
                    this.client.sendScreenshot(resultId, result.getScreenshotPath(), null, null);
                }
            },
            (statusCode, statusText, errorText) => {
                ColorConsole.error('  Could not send TestRail result for case C' + result.getCaseId() + ': ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.debug('');
            }
        );
    }

    /**
     *
     * @param {string} runID
     * @param {Result[]} testResults
     * @returns {Promise<AxiosResponse<*>>}
     */
    sendBatchResults(runID, testResults) {
        const url = '/add_results_for_cases/' + runID;

        const postData = {
            results: [],
        };

        testResults.forEach((result) => {
            var resultEntry = {
                case_id: result.getCaseId(),
                status_id: result.getStatusId(),
                comment: result.getComment().trim(),
            };

            // 0s is not valid
            if (result.getElapsed() !== '0s') {
                resultEntry.elapsed = result.getElapsed();
            }

            postData.results.push(resultEntry);
        });

        return this.client.sendData(
            url,
            postData,
            (response) => {
                ColorConsole.success(' Results sent to TestRail for: ' + testResults.map((r) => 'C' + r.getCaseId()));

                if (this.isScreenshotsEnabled) {
                    testResults.forEach((result, i) => {
                        if (result.getScreenshotPath() !== null && result.getScreenshotPath() !== '') {
                            // there is no identifier, to match both, but
                            // we usually get the same order back as we sent it to TestRail
                            const matchingResultId = response.data[i].id;
                            ColorConsole.debug('    sending screenshot to TestRail for TestCase C' + result.getCaseId());
                            this.client.sendScreenshot(matchingResultId, result.getScreenshotPath(), null, null);
                        }
                    });
                }
            },
            (statusCode, statusText, errorText) => {
                ColorConsole.error('  Could not send list of TestRail results: ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.debug('');
            }
        );
    }
}

module.exports = TestRail;
