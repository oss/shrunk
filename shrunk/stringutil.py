import re
def get_domain(long_url):
    protocol_location = long_url.find("://")
    base_url = long_url[(protocol_location + 3):] # Strip any protocol
    if protocol_location < 0:
        base_url = long_url
        
    slash = base_url.find("/")
    domain = base_url[: base_url.find("/")] # Strip path
    if slash < 0:
        domain = base_url
    # url can contain a-z a hyphen or 0-9 and is seprated by dots.
    # this regex gets rid of any subdomains
    # memes.facebook.com matches facebook.com
    # 1nfo3-384ldnf.doo544-f8.cme-02k4.tk matches cme-02k4.tk
    match = re.search("([a-z\-0-9]+\.[a-z\-0-9]+)$", domain, re.IGNORECASE)
    #search for domain if we can't match for a top domain
    
    return  match.group().lower() if match else domain


def formattime(datetime):
    """Utility function for formatting datetimes.

    This formats datetimes to look like "Nov 19 2015".
    """
    return datetime.strftime("%b %d %Y")
