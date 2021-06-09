import boto3
import uuid
from flask import request, jsonify


def lambda_handler(event, context):
    """
    Creates an Amazon Chime meeting
    :return:
    """
    session = boto3.Session()
    chime = session.client('chime')
    ddb = boto3.resource('dynamodb')

    payload = request.json
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
            ],
            NotificationsConfiguration={
                'SnsTopicArn': 'arn:aws:sns:us-east-2:567463201961:chime-events-topic',
                'SqsQueueArn': 'arn:aws:sqs:us-east-2:567463201961:chime-events-queue'
            }
        )
    except Exception as err:
        return jsonify(str(err)), 503

    meeting = {'Meeting': response['Meeting']}

    # Store meeting in DynamoDB table
    item = {}
    item['meeting_name'] = meeting_name
    item['meeting_id'] = meeting['Meeting']['MeetingId']
    item['meeting'] = meeting

    table = ddb.Table("chime-meetings")
    table.put_item(Item=item)

    return jsonify(meeting), 201
