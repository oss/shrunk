""" shrunk - Rutgers University URL Shortener

Sets up a Flask application for the main web server.
"""
from flask import Flask, render_template, make_response, request, redirect, g, session
from flask_sso import SSO

from shrunk.forms import BlockLinksForm, LinkForm, BlacklistUserForm, AddAdminForm
from shrunk.util import get_db_client, set_logger, formattime
from shrunk.filters import strip_protocol, ensure_protocol

from functools import wraps

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


# Shibboleth handler
@ext.login_handler
def login(user_info):
    if user_info.get("employeeType") not in app.config["VALID_EMPLOYEE_TYPES"] and user_info.get("netid") not in app.config["USER_WHITELIST"]:
        return redirect('/unauthorized')
    session['user'] = user_info
    return redirect('/')

#decorator to check if user is logged in
def require_login(func): 
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not 'user' in session:
            return redirect("/shrunk-login")
        return func(*args, **kwargs)
    return wrapper

def require_admin(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        client = get_db_client(app, g)
        netid = session["user"].get("netid")
        if not client.is_admin(netid):
            return redirect("/")
        return func(*args, **kwargs)
    return wrapper
    

@app.route('/logout')
def logout():
    user=session.pop('user')
    if('DEV_LOGINS' in app.config and app.config['DEV_LOGINS']):
        if(user['netid']=="DEV_ADMIN" or user['netid']=="DEV_USER"):
            return redirect('/')
    return redirect('/shibboleth/Logout')

@app.route('/shrunk-login')
def render_login(**kwargs):
    """Renders the login template.

    Takes a WTForm in the keyword arguments.
    """
    if('DEV_LOGINS' in app.config and app.config['DEV_LOGINS']):
        resp = make_response(render_template('dev_login.html', shib_login='/login', dev_user_login='/dev-user-login', dev_admin_login='/dev-admin-login', **kwargs))
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
        client=get_db_client(app, g)
        if not client.is_admin('DEV_ADMIN'):
            client.add_admin('DEV_ADMIN', 'Justice League')
        
        return redirect('/')
        

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
            client = get_db_client(app, g)
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
@require_login
def render_index(**kwargs):
    """Renders the homepage.

    Renders the homepage for the current user. By default, this renders all of
    the links owned by them. If a search has been made, then only the links
    matching their search query are shown.
    """

    netid = session['user'].get('netid')
    client = get_db_client(app, g)

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
        print("client is not admin")
        all_users = "0"
    else:     
        try:
            all_users = request.args["all_users"]
        except:
            if "all_users" in session:
                all_users = session["all_users"]
                print("case 1")
            else:                       #default is to print only "my links"
                all_users = "0"
                print("case 3")

    #just in case I forgot to account for something
    if all_users == "":
        all_users = "0"

    # Change sorting preferences
    if "sortby" in request.args:
        sortby = request.args["sortby"]
    elif "sortby" in session:
        sortby = session["sortby"]
    else:
        sortby = "0"

    #just in case
    if sortby == "":
        sortby = "0"


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
    #resp.set_cookie("all_users", all_users)
    #resp.set_cookie("sortby", sortby)
    session["all_users"] = all_users
    session["sortby"] = sortby
    return resp

@app.route("/add", methods=["GET", "POST"])
@require_login
def add_link():
    """Adds a new link for the current user."""
    
    netid = session['user'].get('netid')
    # default is no .xxx links
    banned_regexes=["\.xxx"]
    if "BANNED_REGEXES" in app.config:
        banned_regexes=app.config["BANNED_REGEXES"]
    form = LinkForm(request.form,banned_regexes)
    client = get_db_client(app, g)


    if request.method == "POST":
        # Validate the form
        form.long_url.data = ensure_protocol(form.long_url.data)
        if form.validate():
            # TODO Decide whether we want to do something with the response
            kwargs = form.to_json()
            try:
                client.create_short_url(
                    netid=netid,
                    **kwargs
                )
                return redirect("/")
            except Exception as e:
                return render_template("add.html",
                                       errors={'short_url' : [str(e)]},
                                       netid=netid,
                                       admin=client.is_admin(netid),
                                        sortby= "0",
                                        all_users="0")

        else:
            # WTForms detects a form validation error
            return render_template("add.html",
                                   errors=form.errors,
                                   netid=netid,
                                   admin=client.is_admin(netid),
                                    sortby="0",
                                    all_users="0")
    else:
        # GET request
        return render_template("add.html",
                               netid=netid,
                               admin=client.is_admin(netid),
                                sortby="0",
                                all_users="0")


@app.route("/delete", methods=["GET", "POST"])
@require_login
def delete_link():
    """Deletes a link."""

    client = get_db_client(app, g)

    # TODO Handle the response intelligently, or put that logic somewhere else
    if request.method == "POST":
        app.logger.info("Deleting URL: {}".format(request.form["short_url"]))
        client.delete_url(request.form["short_url"])
    return redirect("/")


@app.route("/edit", methods=["GET", "POST"])
def edit_link():
    """Edits a link.

    On POST, this route expects a form that contains the unique short URL that
    will be edited.
    """
    if not 'user' in session:
        # Anonymous user
        return redirect("/shrunk-login")
    netid = session['user'].get('netid')
    client = get_db_client(app, g)
    form = LinkForm(request.form,
                    [strip_protocol(app.config["LINKSERVER_URL"])])

    if request.method == "POST":
        # Validate form before continuing
        if form.validate():
            # Success - make the edits in the database
            kwargs = form.to_json()
            try:
                response = client.modify_url(
                    old_short_url = request.form["old_short_url"],
                    admin=client.is_admin(netid),
                    **kwargs
                )
                return redirect("/")
            except Exception as e:
                return render_template("edit.html",
                                       errors={'short_url' : [str(e)]},
                                       netid=netid,
                                       admin=client.is_admin(netid),
                                       title=request.form["title"],
                                       old_short_url=request.form["old_short_url"],
                                       long_url=request.form["long_url"])
        else:
            # yikes - we might want to refactor this stuff into forms.py
            if not form.long_url.data.startswith("http://"):
                form.long_url.data = "http://" + form.long_url.data

            if form.validate():
                kwargs = form.to_json()
                try:
                    response = client.modify_url(
                        admin=client.is_admin(netid),
                        **kwargs
                    )
                    return redirect("/")
                except Exception as e:
                    return render_template("edit.html",
                                           errors={'short_url' : [str(e)]},
                                           netid=netid,
                                           admin=client.is_admin(netid),
                                           title=request.form["title"],
                                           old_short_url=request.form["old_short_url"],
                                           long_url=request.form["long_url"])
            else:
                # Validation error
                old_short_url = request.form["old_short_url"]
                info = client.get_url_info(old_short_url)
                long_url = info["long_url"]
                title = info["title"]
                return render_template("edit.html",
                                    errors=form.errors,
                                    netid=netid,
                                    admin=client.is_admin(netid),
                                    title=title,
                                    old_short_url=old_short_url,
                                    long_url=long_url)
    else: # GET request
        # Hit the database to get information
        old_short_url = request.args["url"]
        info = client.get_url_info(old_short_url)
        owner = info["netid"]
        if owner != netid and not client.is_admin(netid):
            return render_index(wrong_owner=True)

        long_url = info["long_url"]
        title = info["title"]
        # Render the edit template
        return render_template("edit.html", netid=netid,
                                            admin=client.is_admin(netid),
                                            title=title,
                                            old_short_url=old_short_url,
                                            long_url=long_url)


@app.route("/admin/manage")
@require_login
@require_admin
def admin_manage():
    """Renders a list of administrators.

    Allows an admin to add and remove NetIDs from the list of official
    administrators.
    """
    
    client = get_db_client(app, g)
    netid = session['user'].get('netid')

    return render_template("admin_list.html",
                           admin=True,
                           admins=client.get_admins(),
                           form=AddAdminForm(request.form),
                           netid=netid)


@app.route("/admin/manage/add", methods=["GET", "POST"])
@require_login
@require_admin
def admin_add():
    """Add a new administrator."""
 
    client = get_db_client(app, g)
    netid = session['user'].get('netid')
    
    form = AddAdminForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.add_admin(form.netid.data, netid)
        else:
            # TODO catch validation errors
            pass

    return redirect("/admin/manage")


@app.route("/admin/manage/delete", methods=["GET", "POST"])
@require_login
@require_admin
def admin_delete():
    """Delete an existing administrator."""

    client = get_db_client(app, g)
    netid = session['user'].get('netid')

    if request.method == "POST":
        client.delete_admin(request.form["netid"])

    return redirect("/admin/manage")


@app.route("/admin/links/block", methods=["GET", "POST"])
@require_login
@require_admin
def admin_block_link():
    """Block a link from being shrunk.

    Allows an administrator to block a link pattern from being shrunk by the
    web application. URLs matching the given regular expression will be
    prohibited.
    """
    
    client = get_db_client(app, g)
    netid = session['user'].get('netid')

    form = BlockLinksForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.block_link(form.link.data, netid)
        else:
            # TODO catch validation errors
            pass

    return redirect("/admin/links")


@app.route("/admin/links/unblock", methods=["GET", "POST"])
@require_login
@require_admin
def admin_unblock_link():
    """Remove a link from the banned links list."""

    client = get_db_client(app, g)
    netid = session['user'].get('netid')

    if request.method == "POST":
        client.allow_link(request.form["url"])

    return redirect("/admin/links")


@app.route("/admin/links", methods=["GET", "POST"])
@require_login
@require_admin
def admin_links():
    """Renders the administrator link banlist.

    Allows admins to block (and unblock) particular URLs from being shrunk.
    """
    
    client = get_db_client(app, g)
    netid = session['user'].get('netid')

    return render_template("admin_links.html",
                           admin=True,
                           banlist=client.get_blocked_links(),
                           form=BlockLinksForm(request.form),
                           netid=netid)


@app.route("/admin/")
@require_login
@require_admin
def admin_panel():
    """Renders the administrator panel.

    This displays an administrator panel with navigation links to the admin
    controls.
    """

    client = get_db_client(app, g)
    netid = session['user'].get('netid')

    return render_template("admin.html", netid=netid)


@app.route("/admin/blacklist", methods=["GET", "POST"])
@require_login
@require_admin
def admin_blacklist():
    """Renders the administrator blacklist.

    Allows admins to blacklist users to prevent them from accessing the web
    interface.
    """

    client = get_db_client(app, g)
    netid = session['user'].get('netid')

    return render_template("admin_blacklist.html",
                           admin=True,
                           blacklist=client.get_blacklisted_users(),
                           netid=netid)


@app.route("/admin/blacklist/ban", methods=["GET", "POST"])
@require_login
@require_admin
def admin_ban_user():
    """Ban a user from using the web application.

    Adds a user to the blacklist.
    """

    client = get_db_client(app, g)
    netid = session['user'].get('netid')

    form = BlacklistUserForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.ban_user(form.netid.data, netid)
        else:
            # TODO Catch validation errors
            pass

    return redirect("/admin/blacklist")


@app.route("/admin/blacklist/unban", methods=["GET", "POST"])
@require_login
@require_admin
def admin_unban_user():
    """Unban a user from the blacklist.

    Removes a user from the blacklist, restoring their previous privileges.
    """

    client = get_db_client(app, g)
    netid = session['user'].get('netid')

    if request.method == "POST":
        client.unban_user(request.form["netid"])

    return redirect("/admin/blacklist")
