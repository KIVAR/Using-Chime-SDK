# Deploying Lambda Functions from command line
## Package the function including dependencies
```sh
# Create a virtual environment
python3 -m venv my-env

# Activate it
source my-env/bin/activate

# Install the dependencies
pip install Pillow

# Deactivate the environment
deactivate

# This is where all packages are installed.
cd my-env/lib/python3.8/site-packages

# Zip the current directory and create a file function.zip
zip -r9 ${LAMBDA_FUNCTION_LOCATION}/function.zip .
cd ${LAMBDA_FUNCTION_LOCATION}

# Include the Lambda function in the zip file
zip -g function.zip lambda_function.py 
```

## Create `create_meeting` Lambda function
```sh
# Packing a function that does not have any dependencies.
zip func.zip create_meeting.py

aws lambda create-function --function-name create_meeting \
--zip-file fileb://func.zip \
--handler create_meeting.lambda_handler \
--runtime python3.8 \
--timeout 10 \
--memory-size 1024 \
--role arn:aws:iam::567463201961:role/service-role/create_function-role-p9tqvqrp
```

## Create add_attendee Lambda function
```sh
zip add_attendee.zip add_attendee.py

aws lambda create-function --function-name add_attendee \
--zip-file fileb://add_attendee.zip \
--handler add_attendee.lambda_handler \
--runtime python3.8 \
--timeout 10 \
--memory-size 1024 \
--role arn:aws:iam::567463201961:role/service-role/create_function-role-p9tqvqrp
```

## Invoke a Gateway API using `POST`
Here, we are passing data for the `POST` method using `-d` option.

```sh
curl -s -X POST \
	'https://xectwc6i27.execute-api.us-east-2.amazonaws.com/prod/create-meeting' \
	-H 'content-type: application/json' \
	-d '{ "meeting_name": "Morning" }'

curl -s -X POST \
	'https://xectwc6i27.execute-api.us-east-2.amazonaws.com/prod/add-attendee' \
	-H 'content-type: application/json' \
	-d '{ "attendee_meeting_name": "Morning", "attendee_name": "RK"}'
```

## How to check if CORS is enabled on the API
```sh
curl -v -X OPTIONS https://my4zv3l8dk.execute-api.us-east-2.amazonaws.com/prod/create-meeting
```
```sh
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Date: Thu, 10 Jun 2021 12:42:57 GMT
< Content-Type: application/json
< Content-Length: 0
< Connection: keep-alive
< x-amzn-RequestId: 0c9e8bb6-fbed-4028-8e7a-36ef31c43a54
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
< x-amz-apigw-id: AtZQxHO4iYcFscQ=
< Access-Control-Allow-Methods: OPTIONS,POST
< 
* Connection #0 to host my4zv3l8dk.execute-api.us-east-2.amazonaws.com left intact
```

What this means is that:
- The api accepts requests from any origin (`Access-Control-Allow-Origin: *`)
- `OPTIONS` and `POST` are allowed
- The API accepts any of the specified headers.
****
## Help
- [How to resolve CORS error](https://stackoverflow.com/questions/35190615/api-gateway-cors-no-access-control-allow-origin-header)
****
## My Learnings today
- If I use *Lambda Proxy* (It means HTTP Request is passed to the Lambda using `event`), Use the following code to access the payload sent from UI.

```python
   # The `body` inside the event is a String. Use `json.loads` to convert the string
   # to Python dict object.
   payload = json.loads(event['body'])
   print(payload)
   
   # Now, access the data sent from UI.
   meeting_name = payload['meeting_name']
   client_request_token = str(uuid.uuid4())
```

- Response from the lambda function should be in this format. Without `Access-Control-Allow-Origin`, CORS error will be thrown.
```python
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        'body': json.dumps(meeting)
    }
```

- Enable CORS on API Gateway by selecting the resource, and then clicking on `Enable CORS` option in the dropdown.
****
