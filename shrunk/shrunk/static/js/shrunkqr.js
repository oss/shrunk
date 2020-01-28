(function () {
    let our_url = new URL(document.location);
    const short_url = our_url.searchParams.get('url');
    const print = our_url.searchParams.get('print');
    const dest_url = our_url.origin + '/' + short_url;
    const qr_div = document.getElementById('qr');
    window.qr = qr_div;
    const qr = new QRCode(qr_div, dest_url);
    window.print();
}());
