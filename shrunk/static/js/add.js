document.getElementById("copy_shortened_url").addEventListener("click", copy_shortened_url);

function copy_shortened_url() {
    var copyText = document.getElementById("shortened_url");
    var textArea = document.createElement("textarea");
    textArea.value = copyText.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
}
