(function(){
    let our_url=new URL(document.location);
    const short_url=our_url.searchParams.get("url");
    const print=our_url.searchParams.get("print");
    const dest_url=our_url.origin+"/"+short_url;
    
    const qr_div=document.getElementById("qr");
    window.qr=qr_div;

    const qr=new QRCode(qr_div, dest_url);
    console.log(qr_div.innerHTML);
    
    if(print){
	window.print()
    }else{
	document.getElementById("print").onclick=function(){
	    let print_window=window.open(document.location+"&print=true");
	}

	let download_btn=document.getElementById("download");

	download_btn.onclick=function(){
	    //get first img in qr_div
	    const img_tag=qr_div.getElementsByTagName("img")[0];
	    let download_link=document.createElement("a");

	    download_link.download=short_url+".png";
	    download_link.href=img_tag.src;
	    document.body.appendChild(download_link);
	    download_link.click();
	}
    }
}())
