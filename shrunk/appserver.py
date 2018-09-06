""" shrunk - Rutgers University URL Shortener

Sets up a Flask application for the main web server.
"""
from flask import Flask, render_template, make_response, request, redirect, g, session
from flask_sso import SSO
from shrunk.app_decorate import add_decorators, add_roles_routes

from shrunk.forms import LinkForm, BlacklistUserForm
from shrunk.util import get_db_client, set_logger
from shrunk.stringutil import formattime
from shrunk.filters import strip_protocol, ensure_protocol
import validators

from shrunk.client import BadShortURLException, ForbiddenDomainException, add_shrunk_client
import shrunk.roles as roles

from functools import wraps, partial

import json


# Create application
app = Flask(__name__)

# Import settings in config.py
app.config.from_pyfile("config.py", silent=True)
app.secret_key = app.config['SECRET_KEY']

# Initialize logging
set_logger(app)

# This attaches the *flask_sso* login handler to the SSO_LOGIN_URL,
# which essentially maps the SSO attributes to a dictionary and
# calls *our* login_handler, passing the attribute dictionary
ext = SSO(app=app)

# Allows us to use the function in our templates
app.jinja_env.globals.update(formattime=formattime)

#add client instance to app
add_shrunk_client(app)

#init db client for roles
roles.init(app)

#setup handlers and stuff for admin control panel type objects
#adds routes for /roles/admin /roles/blacklisted /roles/power-user and /roles/blocked-urls
add_decorators(app)
add_roles_routes(app)

# Shibboleth handler
@ext.login_handler
def login(user_info):
    client = app.get_shrunk()
    if user_info.get("employeeType") not in app.config["VALID_EMPLOYEE_TYPES"] \
    and user_info.get("netid") not in app.config["USER_WHITELIST"] \
    and client.is_blacklisted(user_info.get("netid")):
        return redirect("/unauthorized")
    session["user"] = user_info
    return redirect("/")   

@app.route('/logout')
def logout():
    user=session.pop('user')
    if('DEV_LOGINS' in app.config and app.config['DEV_LOGINS']):
        if(user['netid']=="DEV_ADMIN" or user['netid']=="DEV_USER" or user['netid']=="DEV_PWR_USER"):
            return redirect('/')
    return redirect('/shibboleth/Logout')

@app.route('/shrunk-login')
def render_login(**kwargs):
    """Renders the login template.

    Takes a WTForm in the keyword arguments.
    """
    if('DEV_LOGINS' in app.config and app.config['DEV_LOGINS']):
        resp = make_response(render_template('dev_login.html', 
                            shib_login='/login', 
                            dev_user_login='/dev-user-login', 
                            dev_admin_login='/dev-admin-login',
                            dev_power_login='/dev-power-login',
                             **kwargs))
        return resp
    else:
        resp = make_response(render_template('login.html', shib_login='/login', **kwargs))
        return resp

# add devlogins if necessary
if('DEV_LOGINS' in app.config and app.config['DEV_LOGINS']):
    @app.route('/dev-user-login')
    def dev_user_login():
        app.logger.info('user dev login valid')
        session['user']={'netid':'DEV_USER'}
        session["all_users"] = "0"
        session["sortby"] = "0"
        return redirect('/')

    @app.route('/dev-admin-login')
    def dev_admin_login():
        app.logger.info('admin dev login valid')
        session['user']={'netid':'DEV_ADMIN'}
        session["all_users"] = "0"
        session["sortby"] = "0"
        client=app.get_shrunk()
        if not roles.check("admin", "DEV_ADMIN"):
            roles.grant("admin", "Justice Leage", "DEV_ADMIN")
        if not client.is_admin('DEV_ADMIN'):
            client.add_admin('DEV_ADMIN', 'Justice League') 
        return redirect('/')

    @app.route('/dev-power-login')
    def def_power_login():
        session['user']={'netid': 'DEV_PWR_USER'}
        session["all_users"] = "0"
        session["sortby"] = "0"
        client = app.get_shrunk()
        if not roles.check("power_user", "DEV_PWR_USER"):
            roles.grant("power_user", "Admin McAdminface", "DEV_PWR_USER")
        if not client.is_power_user("DEV_PWR_USER"):
            client.add_power_user("DEV_PWR_USER", "Admin McAdminface")
        return redirect("/")
        

@app.route('/unauthorized')
def unauthorized():
    return make_response(render_template('unauthorized.html'))

### Views ###
try:
    if app.config["DUAL_SERVER"]:
        @app.route("/<short_url>")
        def redirect_link(short_url):
            """Redirects to the short URL's true destination.

            This looks up the short URL's destination in the database and performs a
            redirect, logging some information at the same time. If no such link
            exists, a not found page is shown.

            :Parameters:
              - `short_url`: A string containing a shrunk-ified URL.
            """
            client = app.get_shrunk()
            app.logger.info("{} requests {}".format(request.remote_addr, short_url))

            # Perform a lookup and redirect
            long_url = client.get_long_url(short_url)
            if long_url is None:
                return render_template("link-404.html", short_url=short_url)
            else:
                client.visit(short_url, request.remote_addr)
                # Check if a protocol exists
                if "://" in long_url:
                    return redirect(long_url)
                else:
                    return redirect("http://{}".format(long_url))
except KeyError:
    # No setting in the config file
    pass



@app.route("/")
@app.require_login
def render_index(**kwargs):
    """Renders the homepage.

    Renders the homepage for the current user. By default, this renders all of
    the links owned by them. If a search has been made, then only the links
    matching their search query are shown.
    """

    netid = session['user'].get('netid')
    client = app.get_shrunk()

    # Grab the current page number
    try:
        page = int(request.args["p"])
    except:
        page = 0

    # If this exists, execute a search query
    try:
        query = request.args["search"]
    except:
        query = ""

    
    # Display all users or just the current administrator?
    # this question is only a concern if user is admin. 
    if client.is_admin(netid) == False:
        all_users = "0"
    else:     
        try:
            all_users = request.args["all_users"]
        except:
            if "all_users" in session:
                all_users = session["all_users"]
            else:                       #default is to print only "my links"
                all_users = "0"


    #just in case I forgot to account for something
    if all_users == "":
        all_users = "0"
        
    sortby = "0" #default
    # Change sorting preferences
    if "sortby" in request.args:
        sortby = request.args["sortby"]
    elif "sortby" in session:
        sortby = session["sortby"]

    #crappy workaround
    if sortby == "":
        sortby = 0

    # Depending on the type of user, get info from the database
    is_admin = client.is_admin(netid)
    if is_admin:
        if query and all_users == "0":
            #search my links
            cursor = client.search(query, netid=netid)
        elif query and all_users == "1":
            #search all links
            cursor = client.search(query)
        elif all_users == "1":
            #show all links but no query
            cursor=client.get_all_urls()
        else:
            #show all of my links but no query
            cursor = client.get_urls(netid)
    else:
        if query:
            cursor = client.search(query, netid=netid)
            app.logger.info("search: {}, '{}'".format(netid, query))
        else:
            cursor = client.get_urls(netid)
            app.logger.info("render index: {}".format(netid))

    # Perform sorting, pagination and get the results
    cursor.sort(sortby)

    if int(sortby) in [0, 1]:
        page, lastpage = cursor.paginate(page, app.config["MAX_DISPLAY_LINKS"])
        links = cursor.get_results()

    # If links are requested alphabetically, run more specific cursor operations
    elif int(sortby) in [2, 3]:

        # Clone the cursor, and paginate the clone. Sort all links from old cursor.
        page_cursor = client.clone_cursor(cursor)
        page, lastpage = page_cursor.paginate(page, app.config["MAX_DISPLAY_LINKS"])
        links = sorted(cursor.get_results(), key=lambda x: str.lower(x['title']))
        if int(sortby) in [3]: links = reversed(links)

        # Skip and limit on the old cursor's links.
        link_offset = (page-1)*app.config["MAX_DISPLAY_LINKS"]
        links = list(links)[link_offset:link_offset+8]


    
    #choose 9 pages to display so there's not like 200 page links
    #is 9 the optimal number?
        
    begin_pages = -1
    end_pages = -1
    if lastpage < 10:     #9 or fewer pages
        begin_pages = 1
        end_pages = lastpage
    elif page < 5:         #display first 9 pages
        begin_pages=1
        end_pages=9
    elif page > lastpage-4:     #display last 9 pages
        begin_pages = lastpage-8
        end_pages = lastpage
    else:                       #display current page +- 4 adjacent pages
        begin_pages = page-4
        end_pages = page+4

    resp = make_response(
            render_template("index.html",
                            admin=is_admin,
                            all_users=all_users,
                            begin_pages=begin_pages,
                            end_pages=end_pages,
                            lastpage=lastpage,
                            links=links,
                            linkserver_url=app.config["LINKSERVER_URL"],
                            netid=netid,
                            page=page,
                            query=query,
                            sortby=sortby,
                            **kwargs))
    #TODO since we're not setting we probably dont need make_response
    #resp.set_cookie("all_users", all_users)
    #resp.set_cookie("sortby", sortby)
    session["all_users"] = all_users
    session["sortby"] = sortby
    return resp

@app.route("/add", methods=["POST"])
@app.require_login
def add_link():
    """Adds a new link for the current user. and handles errors"""
    # default is no .xxx links
    banned_regexes = ["\.xxx"]
    if "BANNED_REGEXES" in app.config:
        banned_regexes = app.config["BANNED_REGEXES"]
    form = LinkForm(request.form, banned_regexes)
    netid = session['user'].get('netid')
    client = app.get_shrunk()

    template={
        'netid': netid,
        'sortby': "0",
        'all_users': "0",
        'admin': client.is_admin(netid),
        'power_user': client.is_power_user(netid)
    }
    def add_url_template(**kwargs):
        template.update(kwargs)
        return render_template("add.html", **template)
    
    form.long_url.data = ensure_protocol(form.long_url.data)
    if form.validate():
        # TODO Decide whether we want to do something with the response
        kwargs = form.to_json()
        kwargs['netid'] = netid
        try:
            client.create_short_url(**kwargs)
            return redirect("/")
        except BadShortURLException as e:
            return add_url_template(errors = {'short_url': [str(e)]})
        except ForbiddenDomainException as e:
            return add_url_template(errors = {'long_url': [str(e)]})
    else: # WTForms detects a form validation error:
        return add_url_template(errors = form.errors)

@app.route("/add", methods=["GET"])
@app.require_login
def add_link_form():
    """Displays link form"""
    client = app.get_shrunk()
    netid = session['user'].get('netid')
    template = {
        'netid': netid,
        'admin': client.is_admin(netid),
        'power_user': client.is_power_user(netid),
        'sortby': "0",
        'all_users': "0"
    }
    return render_template("add.html", **template)

@app.route("/stats", methods=["GET"])
@app.require_login
def get_stats():
    #should we require owner or admin to view?
    template_data={"url_info": {}, 
                   "missing_url": False,
                   "monthy_visits": []}

    if "url" in request.args:
        url=request.args["url"]
        client=app.get_shrunk()
        template_data["url_info"]=client.get_url_info(url)
    else:
        template_data["missing_url"]=True

    return render_template("stats.html", **template_data)

@app.route("/monthly_visits", methods=["GET"])
@app.require_login
def monthly_visits():
    url=request.args["url"]
    client=app.get_shrunk()
    netid=session["user"].get("netid")

    if "url" not in request.args:
        return '{"error":"request must have url"}', 400

    elif not client.is_owner_or_admin(url, netid):
        return '{"error":"not authorized"}', 401

    else:
        visits=client.get_monthly_visits(url)
        return json.dumps(visits)

@app.route("/qr", methods=["GET"])
@app.require_login
def qr():
    kwargs={"print": "print" in request.args}
    return render_template("qr.html", **kwargs)



@app.route("/delete", methods=["GET", "POST"])
@app.require_login
def delete_link():
    """Deletes a link."""

    client = app.get_shrunk()
    netid = session["user"].get("netid")

    # TODO Handle the response intelligently, or put that logic somewhere else
    if request.method == "POST":
        app.logger.info("Deleting URL: {}".format(request.form["short_url"]))
        client.delete_url(request.form["short_url"], netid)
    return redirect("/")


@app.route("/edit", methods=["POST"])
@app.require_login
def edit_link():
    """Edits a link.

    On POST, this route expects a form that contains the unique short URL that
    will be edited.
    """
    netid = session['user'].get('netid')
    client = app.get_shrunk()

    # default is no .xxx links
    banned_regexes = ["\.xxx"]
    if "BANNED_REGEXES" in app.config:
        banned_regexes = app.config["BANNED_REGEXES"]
        
    form = LinkForm(request.form, banned_regexes)
    form.long_url.data = ensure_protocol(form.long_url.data)

    template = {
        "netid": netid,
        "show_short_url": client.is_admin(netid) or client.is_power_user(netid),
        "title": request.form["title"],
        "old_short_url": request.form["old_short_url"],
        "long_url": request.form["long_url"]
    }
    def edit_url_template(**kwargs):
        template.update(kwargs)
        return render_template("edit.html", **template)
    
    # Validate form before continuing
    if form.validate():
        # Success - make the edits in the database
        kwargs = form.to_json()
        kwargs['admin'] = client.is_admin(netid)
        kwargs['power_user'] = client.is_power_user(netid)
        kwargs['old_short_url'] = request.form['old_short_url']
        try:
            response = client.modify_url(**kwargs)
            return redirect("/")
        except BadShortURLException as e:
            return edit_url_template(errors={'short_url' : [str(e)]})
        except ForbiddenDomainException as e:
            return edit_url_template(errors={'long_url' : [str(e)]})
    else:
        info = client.get_url_info(template['old_short_url'])
        return edit_url_template(errors=form.errors, **info)

@app.route("/edit", methods=["GET"])
@app.require_login
def edit_link_form():
    netid = session['user'].get('netid')
    client = app.get_shrunk()
    form = LinkForm(request.form,
                    [strip_protocol(app.config["LINKSERVER_URL"])])
    # Hit the database to get information
    old_short_url = request.args["url"]
    info = client.get_url_info(old_short_url)
    owner = info["netid"]
    if owner != netid and not client.is_admin(netid):
        return render_index(wrong_owner=True)

    info['old_short_url']=old_short_url
    info['show_short_url']=client.is_admin(netid) or client.is_power_user(netid)
    # Render the edit template
    return render_template("edit.html", **info)

@app.route("/admin/")
@app.require_login
@app.require_admin
def admin_panel():
    """Renders the administrator panel.

    This displays an administrator panel with navigation links to the admin
    controls.
    """

    client = app.get_shrunk()
    netid = session['user'].get('netid')

    return render_template("admin.html", netid=netid)
