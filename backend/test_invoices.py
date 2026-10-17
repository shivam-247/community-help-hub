from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import secrets
import smtplib
from sqlmodel import Session, select
from test_security import setup, auth
from app.models import User
from app.product_models import Invoice, InvoiceReceipt, EmailOutbox, TrustRecord
from app.product import drain_outbox, send_email
from app.invoice_receipts import date_label

SMTP = {'SMTP_HOST':'smtp.example.invalid','SMTP_FROM':'hub@example.invalid'}

def buy(client, user_id, **values):
    with patch.dict('os.environ', {'MOCK_CHECKOUT_ENABLED':'true'}):
        return client.post('/billing/checkout', headers=auth(user_id), json={
            'plan':'plus','cycle':'monthly','checkout_key':secrets.token_hex(16),**values})

def test_receipt_is_atomic_idempotent_and_preserves_purchase_terms(setup):
    client,engine,ids,*_=setup
    key=secrets.token_hex(16)
    first=buy(client,ids[0],cycle='yearly',checkout_key=key).json()['invoice']
    assert buy(client,ids[0],cycle='yearly',checkout_key=key).json()['duplicate']
    before=client.get(f"/billing/invoices/{first['id']}",headers=auth(ids[0])).json()
    buy(client,ids[0],plan='free')
    assert client.get(f"/billing/invoices/{first['id']}",headers=auth(ids[0])).json()==before
    fields={x['label']:x['value'] for x in before['fields']}
    assert fields['Simulated plan price']=='INR 950.00'
    assert fields['Actually charged'].startswith('INR 0.00') and 'Unlimited' in fields['Usage allowance']
    with Session(engine) as session:
        row=session.get(InvoiceReceipt,first['id'])
        assert (row.expires_at-row.starts_at).days==365
        assert len(session.exec(select(InvoiceReceipt)).all())==2
        assert len(session.exec(select(EmailOutbox).where(EmailOutbox.subject.startswith('Test invoice'))).all())==2
    assert 'IST' in fields['Purchased on'] and before['email_status']=='awaiting_setup'

def test_invoice_details_document_and_email_are_owner_only(setup):
    client,_,ids,*_=setup
    invoice=buy(client,ids[0]).json()['invoice']['id']
    for path in [f'/billing/invoices/{invoice}',f'/billing/invoices/{invoice}/document']:
        assert client.get(path,headers=auth(ids[1])).status_code==404
        assert client.get(path).status_code==401
    assert client.post(f'/billing/invoices/{invoice}/email',headers=auth(ids[1])).status_code==404
    assert client.post(f'/billing/invoices/{invoice}/email',headers=auth(ids[0]),json={'recipient':'other@example.com'}).json()['recipient']=='user@example.com'
    document=client.get(f'/billing/invoices/{invoice}/document',headers=auth(ids[0]))
    assert document.status_code==200 and document.headers['content-type'].startswith('text/html')
    assert 'attachment;' in document.headers['content-disposition'] and 'No money was charged' in document.text

def test_unverified_receipt_waits_then_sends_after_email_verification(setup):
    client,engine,ids,*_=setup
    invoice=buy(client,ids[0]).json()['invoice']['id']
    with patch.dict('os.environ',SMTP):
        with patch('app.product.send_email') as sender:
            drain_outbox(engine);assert sender.call_count==0
            client.post('/account/email/send',headers=auth(ids[0]))
            drain_outbox(engine)
            code=sender.call_args.args[2].split('Your code is ')[1].split('.')[0]
            assert client.post('/account/email/verify',headers=auth(ids[0]),json={'code':code}).status_code==200
            drain_outbox(engine)
            assert sender.call_args.args[0]=='user@example.com'
            assert 'Test invoice' in sender.call_args.args[1]
            assert len(sender.call_args.args)==4 and '<table>' in sender.call_args.args[3]
            assert 'Valid until:' in sender.call_args.args[2]
        assert client.get(f'/billing/invoices/{invoice}',headers=auth(ids[0])).json()['email_status']=='accepted'
        assert client.post(f'/billing/invoices/{invoice}/email',headers=auth(ids[0])).status_code==429

def test_verified_receipt_is_transactional_and_html_is_escaped(setup):
    client,engine,ids,*_=setup
    with Session(engine) as session:
        user=session.get(User,ids[0]);user.name='<img src=x onerror=alert(1)>';session.add(user)
        session.add(TrustRecord(user_id=ids[0],email_verified=True));session.commit()
    invoice=buy(client,ids[0]).json()['invoice']['id']
    assert client.get(f'/billing/invoices/{invoice}',headers=auth(ids[0])).json()['email_status']=='awaiting_setup'
    with patch.dict('os.environ',SMTP),patch('app.product.send_email') as sender:
        drain_outbox(engine)
        assert sender.call_count==1
        html=sender.call_args.args[3]
        assert '<img src=x' not in html and '&lt;img src=x' in html
        with Session(engine) as session:
            receipt=session.get(InvoiceReceipt,invoice)
            receipt.email_requested_at=datetime.now(timezone.utc)-timedelta(minutes=2)
            session.add(receipt);session.commit()
        assert client.post(f'/billing/invoices/{invoice}/email',headers=auth(ids[0])).json()['email_status']=='queued'
        drain_outbox(engine);assert sender.call_count==2

def test_delivery_failure_is_visible_and_attempts_are_capped(setup):
    client,engine,ids,*_=setup
    with Session(engine) as session:
        session.add(TrustRecord(user_id=ids[0],email_verified=True));session.commit()
    invoice=buy(client,ids[0]).json()['invoice']['id']
    with patch.dict('os.environ',SMTP),patch('app.product.send_email',side_effect=smtplib.SMTPException('provider unavailable')) as sender:
        for _ in range(7):drain_outbox(engine)
        assert sender.call_count==5
        detail=client.get(f'/billing/invoices/{invoice}',headers=auth(ids[0])).json()
        assert detail['email_status']=='failed' and detail['attempts']==5
        assert 'provider unavailable' not in str(detail)

def test_legacy_receipt_is_generated_without_recharging(setup):
    client,engine,ids,*_=setup
    with Session(engine) as session:
        invoice=Invoice(user_id=ids[0],checkout_key=secrets.token_hex(16),plan='free',cycle='monthly',amount_paise=0)
        session.add(invoice);session.commit();session.refresh(invoice);iid=invoice.id
    assert client.get(f'/billing/invoices/{iid}',headers=auth(ids[0])).json()['legacy']
    receipt=client.post(f'/billing/invoices/{iid}/email',headers=auth(ids[0])).json()
    assert not receipt['legacy'] and receipt['email_status']=='awaiting_setup'
    fields={x['label']:x['value'] for x in receipt['fields']}
    assert fields['Valid until']=='No expiry on Free' and '5 posts' in fields['Usage allowance']

def test_smtp_message_contains_plain_and_html_alternatives():
    with patch.dict('os.environ',SMTP),patch('app.product.smtplib.SMTP') as smtp:
        send_email('neighbour@example.com','Test invoice','Plain receipt','<p>Test receipt</p>')
        client=smtp.return_value.__enter__.return_value
        client.starttls.assert_called_once()
        import ssl
        assert client.starttls.call_args.kwargs["context"].verify_mode == ssl.CERT_REQUIRED
        message=client.send_message.call_args.args[0]
        assert message['To']=='neighbour@example.com'
        assert message.get_body(preferencelist=('plain',)).get_content().strip()=='Plain receipt'
        assert '<p>Test receipt</p>' in message.get_body(preferencelist=('html',)).get_content()
    assert date_label(datetime(2026,10,17,0,0,tzinfo=timezone.utc))=='17 Oct 2026, 05:30 AM IST'
