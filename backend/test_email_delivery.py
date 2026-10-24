import json
from unittest.mock import Mock, patch
import pytest
from app.email_delivery import email_available, send_resend
from app.product import send_email


@pytest.fixture
def resend_env(monkeypatch):
    monkeypatch.setenv('EMAIL_PROVIDER', 'resend')
    monkeypatch.setenv('RESEND_API_KEY', 'test-key-not-a-real-credential')
    monkeypatch.setenv('EMAIL_FROM', 'Help Hub <hello@example.invalid>')


def test_https_provider_configuration_fails_closed(resend_env, monkeypatch):
    assert email_available()
    monkeypatch.delenv('RESEND_API_KEY')
    assert not email_available()
    monkeypatch.setenv('EMAIL_PROVIDER', 'unknown')
    assert not email_available()


def test_resend_sends_plain_and_html_email_over_fixed_verified_https(resend_env):
    response = Mock(status=200)
    response.read.return_value = b'{"id":"test-delivery-id"}'
    connection = Mock()
    connection.getresponse.return_value = response
    with patch('app.email_delivery.http.client.HTTPSConnection', return_value=connection) as transport:
        send_email('neighbour@example.invalid', 'Verification', 'Your code is 123456.', '<p>Your code is 123456.</p>')
    assert transport.call_args.args == ('api.resend.com',)
    assert transport.call_args.kwargs['timeout'] == 15
    assert transport.call_args.kwargs['context'].check_hostname
    args, kwargs = connection.request.call_args
    assert args == ('POST', '/emails')
    payload = json.loads(kwargs['body'])
    assert payload['to'] == ['neighbour@example.invalid']
    assert payload['text'] == 'Your code is 123456.' and payload['html'].startswith('<p>')
    connection.close.assert_called_once()


@pytest.mark.parametrize('status,body', [(403,b'private-address-and-code'), (302,b'redirect'), (200,b'not-json'), (200,b'{}'), (200,b'x'*16385)])
def test_rejected_redirected_or_malformed_acknowledgement_is_not_success(resend_env, status, body):
    response = Mock(status=status)
    response.read.return_value = body
    connection = Mock()
    connection.getresponse.return_value = response
    with patch('app.email_delivery.http.client.HTTPSConnection', return_value=connection):
        with pytest.raises(OSError) as error:
            send_resend('neighbour@example.invalid', 'OTP', 'private-code')
    assert 'private' not in str(error.value) and 'test-key' not in str(error.value)
    assert connection.request.call_count == 1
    connection.close.assert_called_once()
