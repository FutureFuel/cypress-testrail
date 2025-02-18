const axios = require('axios');
const ApiError = require('./ApiError');
const FormData = require('form-data');
const fs = require('fs');

class ApiClient {
    /**
     * @param domain
     * @param username
     * @param password
     */
    constructor(domain, username, password) {
        this.username = username;
        this.password = password;
        this.baseUrl = `https://${domain}/index.php?/api/v2`;
    }

    /**
     *
     * @param slug
     * @param postData
     * @param onSuccess
     * @param onError
     * @returns {Promise<AxiosResponse<any>>}
     */
    async getData(slug) {
        return axios({
            method: 'get',
            url: this.baseUrl + slug,
            headers: {
                'Content-Type': 'application/json',
            },
            auth: {
                username: this.username,
                password: this.password,
            },
        })
            .then((response) => response.data)
    }

    /**
     *
     * @param slug
     * @param postData
     * @param onSuccess
     * @param onError
     * @returns {Promise<AxiosResponse<any>>}
     */
    sendData(slug, postData, onSuccess, onError) {
        return axios({
            method: 'post',
            url: this.baseUrl + slug,
            headers: {
                'Content-Type': 'application/json',
            },
            auth: {
                username: this.username,
                password: this.password,
            },
            data: JSON.stringify(postData),
        })
            .then((response) => {
                onSuccess(response);
            })
            .catch((error) => {
                // extract our error
                const apiError = new ApiError(error);
                // notify about an error
                onError(apiError.getStatusCode(), apiError.getStatusText(), apiError.getErrorText());
            });
    }

    /**
     *
     * @param resultId
     * @param screenshotPath
     * @param onSuccess
     * @param onError
     * @returns {Promise<AxiosResponse<any>>}
     */
    sendScreenshot(resultId, screenshotPath, onSuccess, onError) {
        const formData = new FormData();
        formData.append('attachment', fs.createReadStream(screenshotPath));

        return axios({
            method: 'post',
            url: this.baseUrl + '/add_attachment_to_result/' + resultId,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            auth: {
                username: this.username,
                password: this.password,
            },
            data: formData,
        })
            .then((response) => {
                if (onSuccess) {
                    onSuccess(response);
                }
            })
            .catch((error) => {
                // extract our error
                const apiError = new ApiError(error);
                // notify about an error
                if (onError) {
                    onError(apiError.getStatusCode(), apiError.getStatusText(), apiError.getErrorText());
                }
            });
    }
}

module.exports = ApiClient;
