from flask_login import UserMixin
from flask_auth import LoginForm
from wtforms import TextField, PasswordField, validators

class User(UserMixin):
    def __init__(self, netid):
        self.netid = netid
        self.id = netid

def get_user(fields):
    return User(fields['username'])

class RULoginForm(LoginForm):
    username = TextField('Netid', validators=[validators.DataRequired()])
    password = PasswordField('Password',
            validators=[validators.DataRequired()])
