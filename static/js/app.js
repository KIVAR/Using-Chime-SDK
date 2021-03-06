var region;
var userPoolId;
var identityPoolId;
var appId;
var poolData;
var userPool;
var cognitoUser = '';
var idToken = '';

// On Page loading, execute this
window.addEventListener('DOMContentLoaded', saveConfigData);

// Set Event handlers
document.getElementById('signup-btn').addEventListener('click', addUser);
document.getElementById('confirm-user-btn').addEventListener('click', confirmUser);
document.getElementById('signin-btn').addEventListener('click', authenticateUser);

var signupMessage = document.getElementById('signup-message');
var signinMessage = document.getElementById('signin-message');

/**
 * Configure a userPool object.
 * @param {*} e 
 */
function saveConfigData(e) {
    e.preventDefault();

    region = 'us-east-2';
    userPoolId = 'us-east-2_NuAreech2';
    // identityPoolId = '';
    appId = 'i6spf3rp58te0usidonvcbbof';

    poolData = {
        UserPoolId: userPoolId,
        ClientId: appId
    };

    userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
}


/**
 * Signup a User
 * @param e
 */
function addUser(e) {
    signupMessage.style.display = 'none';
    signupMessage.className = '';

    e.preventDefault();

    let name = document.getElementById('name').value.trim();
    let email = document.getElementById('signup-email').value.trim();
    let password = document.getElementById('signup-password').value.trim();

    if (name.length === 0 || email === 0 || password === 0) {
        return;
    }

    let attributeList = [
        new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
            Name: 'name', Value: name
        }),
    ];

    userPool.signUp(email, password, attributeList, null, function (err, result) {
        if (err) {
            signupMessage.innerText = err;
            signupMessage.style.display = 'block';
            signupMessage.className = 'alert alert-danger';
            return;
        }

        cognitoUser = result.user;
        console.log('user name is ' + cognitoUser.getUsername());

        // Show a text box to enter Confirmation code
        document.getElementById('signup-btn').style.display = 'none';
        document.getElementById('code-block').style.display = 'block';
        document.getElementById('confirm-user-btn').style.display = 'inline-block';
    });
}

/**
 * Confirm the user by taking the Confirmation code.
 * @param e
 */
function confirmUser(e) {
    e.preventDefault();
    let verificationCode = document.getElementById('code').value;

    cognitoUser.confirmRegistration(verificationCode, true, function (err, result) {
        if (err) {
            signupMessage.innerText = err;
            signupMessage.style.display = 'block';
            signupMessage.className = 'alert alert-danger';
            return;
        }

        signupMessage.innerText = result;
        signupMessage.style.display = 'block';
        signupMessage.className = 'alert alert-success';
    });
}

/**
 * Signin user with Email and Password
 * @param e
 */
function authenticateUser(e) {
    e.preventDefault();

    let email = document.getElementById('signin-email').value;
    let password = document.getElementById('signin-password').value;

    if (email.length === 0 || password === 0 || userPool === null || userPool === undefined) {
        signinMessage.innerText = 'Fill in all fields!';
        signinMessage.style.display = 'block';
        signinMessage.className = 'alert alert-danger';
        return;
    }

    let authenticationData = {
        Username: email,
        Password: password,
    };

    let authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

    let userData = {
        Username: email,
        Pool: userPool
    };

    let cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {
                signinMessage.innerText = 'Authentication Success!';
                signinMessage.style.display = 'block';
                signinMessage.className = 'alert alert-success';

                let cognitoUser = userPool.getCurrentUser();

                if (cognitoUser != null) {
                    cognitoUser.getSession(function (err, result) {
                        if (result) {
                            // Set the region where your identity pool exists (us-east-1, eu-west-1)
                            AWS.config.region = region;
                            AWS.config.update({region: region});

                            logins = {};
                            let key = 'cognito-idp.' + region + '.amazonaws.com/' + userPoolId;
                            logins[key] = result.getIdToken().getJwtToken();
                            idToken = result.getIdToken().getJwtToken();

                            // Add the User's Id Token to the Cognito credentials login map.
                            // AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                            //     IdentityPoolId: identityPoolId,
                            //     Logins: logins,
                            // });

                            // Make the call to obtain credentials
                            // AWS.config.credentials.get(function () {
                            //     // Credentials will be available when this function is called.
                            //     var accessKeyId = AWS.config.credentials.accessKeyId;
                            //     var secretAccessKey = AWS.config.credentials.secretAccessKey;
                            //     var sessionToken = AWS.config.credentials.sessionToken;
                            // });

                            // Clear the screen
                            document.getElementById('screen-1').remove();
                            document.getElementById('temp-space').remove();
                            document.getElementById('screen-2').style.display = 'block';
                        }
                    });
                }
            },
            onFailure: function (err) {
                signinMessage.innerText = err;
                signinMessage.style.display = 'block';
                signinMessage.className = 'alert alert-danger';
            }
        }
    );
}

function createListElement(key, text) {
    let li = document.createElement('li');
    li.innerText = key + ' - ' + text;
    return li;
}

function parseIdToken(idToken) {
    let decodedIdToken = jwt_decode(idToken);

    let temp = document.createElement('ul');
    temp.appendChild(createListElement('token_use', decodedIdToken.token_use));
    temp.appendChild(createListElement('aud', decodedIdToken.aud));
    temp.appendChild(createListElement('sub', decodedIdToken.sub));
    temp.appendChild(createListElement('cognito:username', decodedIdToken['cognito:username']));
    temp.appendChild(createListElement('auth_time', decodedIdToken.auth_time));
    temp.appendChild(createListElement('exp', decodedIdToken.exp));
    temp.appendChild(createListElement('email', decodedIdToken.email));
    temp.appendChild(createListElement('email_verified', decodedIdToken.email_verified));
    temp.appendChild(createListElement('event_id', decodedIdToken.event_id));
    temp.appendChild(createListElement('given_name', decodedIdToken.given_name));
    temp.appendChild(createListElement('iat', decodedIdToken.iat));
    temp.appendChild(createListElement('iss', decodedIdToken.iss));

    return temp;
}

function parseAccessToken(accessToken) {
    let decodedAccessToken = jwt_decode(accessToken);

    let temp = document.createElement('ul');
    temp.appendChild(createListElement('token_use', decodedAccessToken.token_use));
    temp.appendChild(createListElement('client_id', decodedAccessToken.client_id));
    temp.appendChild(createListElement('sub', decodedAccessToken.sub));
    temp.appendChild(createListElement('username', decodedAccessToken.username));
    temp.appendChild(createListElement('auth_time', decodedAccessToken.auth_time));
    temp.appendChild(createListElement('event_id', decodedAccessToken.event_id));
    temp.appendChild(createListElement('exp', decodedAccessToken.exp));
    temp.appendChild(createListElement('iat', decodedAccessToken.iat));
    temp.appendChild(createListElement('iss', decodedAccessToken.iss));
    temp.appendChild(createListElement('jti', decodedAccessToken.jti));
    temp.appendChild(createListElement('scope', decodedAccessToken.scope));

    return temp;
}

function listS3Bucket(bucket) {
    let temp = document.createElement('ul');

    // Create a new service object
    var s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        params: {Bucket: bucket}
    });

    // Call S3 to list the buckets
    s3.listObjects({Delimiter: '/'}, function (err, data) {
        if (err) {
            return alert('There was an error listing your albums: ' + err.message);
        } else {
            data.CommonPrefixes.map(function (commonPrefix) {
                var prefix = commonPrefix.Prefix;
                var prefixWithoutSlash = decodeURIComponent(prefix.replace('/', ''));
                var key = encodeURIComponent(prefixWithoutSlash) + '/';

                s3.listObjects({Prefix: key}, function (err, data) {
                    if (err) {
                        return alert('There was an error viewing your album: ' + err.message);
                    }
                    // 'this' references the AWS.Response instance that represents the response
                    var href = this.request.httpRequest.endpoint.href;
                    var bucketUrl = href + bucket + '/';

                    data.Contents.map(function (photo) {
                        var photoKey = photo.Key;
                        var photoUrl = bucketUrl + encodeURIComponent(photoKey);
                        temp.appendChild(createListElement('Object', photoUrl));
                    });
                });
            });
        }
    });

    document.getElementById('s3-objects').appendChild(temp);
}
