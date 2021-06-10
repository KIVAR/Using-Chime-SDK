import boto3
import json
import uuid

def lambda_handler(event, context):
    """
    Creates an Amazon Chime meeting
    :return:
    """
    session = boto3.Session()
    chime = session.client('chime')
    ddb = boto3.resource('dynamodb')

    payload = json.loads(event['body'])
    print(payload)
    meeting_name = payload['meeting_name']
    client_request_token = str(uuid.uuid4())

    try:
        response = chime.create_meeting(
            ClientRequestToken=client_request_token,
            ExternalMeetingId=meeting_name,
            MediaRegion='us-east-1',
            Tags=[
                {
                    'Key': 'Name',
                    'Value': 'Chime meeting'
                },
            ]
        )
    except Exception as err:
        return json.dumps(str(err)), 503

    meeting = {'Meeting': response['Meeting']}

    # Store meeting in DynamoDB table
    item = {}
    item['meeting_name'] = meeting_name
    item['meeting_id'] = meeting['Meeting']['MeetingId']
    item['meeting'] = meeting

    table = ddb.Table("chime-meetings")
    table.put_item(Item=item)

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        'body': json.dumps(meeting)
    }