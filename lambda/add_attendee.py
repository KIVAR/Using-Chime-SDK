import boto3
import json

def lambda_handler(event, context):
    """
    Adds an attendee to a Chime meeting
    :return:
    """
    session = boto3.Session()
    chime = session.client('chime')
    ddb = boto3.resource('dynamodb')

    payload = json.loads(event['body'])
    print(payload)
    
    attendee_meeting_name = payload['attendee_meeting_name']
    attendee_name = payload['attendee_name']

    # Retrieve meeting name from DynamoDB
    table = ddb.Table("chime-meetings")

    response = table.get_item(
        Key={
            'meeting_name': attendee_meeting_name,
        }
    )
  
    if 'Item' not in response:
        return {
            'statusCode': 503,
            'body': f'Meeting {attendee_meeting_name} does not exist!'
        }

    meeting = response['Item']['meeting']
    meeting_id = response['Item']['meeting_id']

    try:
        response = chime.create_attendee(
            MeetingId=meeting_id,
            ExternalUserId=attendee_name,
            Tags=[
                {
                    'Key': 'Attendee for meeting',
                    'Value': attendee_name
                },
            ]
        )
    except Exception as err:
        return {
        'statusCode': 503,
        'body': 'Unable to add meeting to the meeting.' + str(err)
    }

    result = {}
    result['meeting'] = meeting
    result['attendee'] = {'Attendee': response['Attendee']}

    return {
        'statusCode': 200,
         'headers': {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        'body': json.dumps(result)
    }