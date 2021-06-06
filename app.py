from flask import Flask
import boto3
from logging.handlers import RotatingFileHandler
import logging
import uuid
from flask import request, jsonify, render_template

# AWS CLI profile name
from flask_cors import cross_origin

session = boto3.Session(profile_name='default')
chime = session.client('chime')

app = Flask(__name__)

# Setup logging
logfile_location = 'logs/chime-application-log.log'
log_level = logging.DEBUG
log_format = '%(asctime)s %(levelname)s: [%(filename)s:%(lineno)d] : %(message)s'

logger = logging.getLogger()
handler = RotatingFileHandler(logfile_location, maxBytes=10000000, backupCount=10)
formatter = logging.Formatter(log_format)
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(log_level)


def flatten_json(json_doc):
    out = {}

    def flatten(x, name=''):
        if type(x) is dict:
            for a in x:
                flatten(x[a], name + a + '.')
        elif type(x) is list:
            i = 0
            for a in x:
                flatten(a, name + str(i) + '.')
                i += 1
        else:
            out[name[:-1]] = x

    flatten(json_doc)
    return out


@app.route('/create-meeting', methods=['POST', 'OPTIONS'])
@cross_origin()
def create_meeting():
    """
    Creates an Amazon Chime meeting
    :return:
    """
    payload = request.json
    app.logger.debug(payload)
    meeting_name = payload['meeting_name']

    try:
        response = chime.create_meeting(
            ClientRequestToken=str(uuid.uuid4()),
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
        app.logger.error("Unable to create meeting")
        app.logger.error(str(err))
        return jsonify(str(err)), 503

    for key, value in sorted(flatten_json(response).items()):
        app.logger.debug('{:70} : {:30}'.format(key, str(value)))

    meeting = {'Meeting': response['Meeting']}
    return jsonify(meeting), 201


@app.route('/add-attendee', methods=['POST', 'OPTIONS'])
@cross_origin()
def add_attendee():
    """

    :return:
    """
    payload = request.json
    meeting_id = payload['meeting_id']
    attendee_name = payload['attendee_name']

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
        app.logger.error(f"Unable to add attendee to meeting: {meeting_id}")
        app.logger.error(str(err))
        return jsonify(str(err)), 503

    attendee = {'Attendee': response['Attendee']}
    return jsonify(attendee), 201


if __name__ == '__main__':
    app.debug = True
    app.run()
