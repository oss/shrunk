echo "Content-Type: text/plain"

if [[ $REQUEST_METHOD != "POST" ]]; then
    echo -en "Status: 405 must send key via post\n\n"
    exit 0
fi

#get the key vai post from stdin                                                                                                     
KEY=$(cat <&0)
SECRET=$(cat /var/www/checksecret)
if [[ $KEY != $SECRET ]]; then
    echo -en "Status: 401 must send key via post\n\n"
    exit 0
fi
