"""Normalise plain-text content without modifying credentials or opaque tokens."""
import unicodedata
from html.parser import HTMLParser
from pydantic import BaseModel, ConfigDict, model_validator

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.blocked = 0
    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style'}:
            self.blocked += 1
    def handle_endtag(self, tag):
        if tag in {'script', 'style'}:
            self.blocked = max(0, self.blocked - 1)
    def handle_data(self, data):
        if not self.blocked:
            self.parts.append(data)


def clean_text(value):
    if isinstance(value, str):
        value = unicodedata.normalize('NFC', value)
        value = ''.join(c for c in value if (ord(c) >= 32 or c in '\n\t')
                        and ord(c) != 127 and c not in '\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069')
        parser = PlainText()
        parser.feed(value)
        parser.close()
        return ''.join(parser.parts).strip()
    if isinstance(value, list):
        return [clean_text(item) for item in value]
    return value

class InputModel(BaseModel):
    model_config = ConfigDict(extra='forbid', str_max_length=10000)

    @model_validator(mode='before')
    @classmethod
    def plain_text_fields(cls, data):
        if not isinstance(data, dict):
            return data
        # Passwords must remain byte-for-byte identical; opaque codes retain strict validators.
        opaque = {'password', 'current_password', 'new_password', 'totp_code', 'code',
                  'secret', 'invite_code', 'checkout_key', 'image_url', 'avatar'}
        return {key: value if key in opaque else clean_text(value) for key, value in data.items()}
