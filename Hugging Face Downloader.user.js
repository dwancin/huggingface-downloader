// ==UserScript==
// @name         Hugging Face Downloader
// @icon         https://huggingface.co/front/assets/huggingface_logo-noborder.svg
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Download all files from a Hugging Face model, dataset, or space.
// @author       dwancin
// @match        https://huggingface.co/*/tree/main
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    // Import JSZip library for creating zip files
    let script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js";
    document.head.appendChild(script);

    // Function to download individual files
    const downloadFile = (url) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "arraybuffer",
                onload: function(response) {
                    resolve(response.response);
                },
                onerror: function(err) {
                    reject(err);
                }
            });
        });
    };

    // Function to download all files and create zip
    const downloadAllFiles = async (files, author, name) => {
        let zip = new JSZip();

        for (const file of files) {
            const url = `https://huggingface.co/${author}/${name}/resolve/main/${file}`;
            const fileData = await downloadFile(url);
            zip.file(file, fileData);
        }

        const zipData = await zip.generateAsync({ type:"blob" });
        const url = URL.createObjectURL(zipData);

        // Download the zip file
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${name}.zip`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    };

    // Add "Download All" button next to "Add file" button
    const addButton = () => {
        const header = document.querySelector('header.flex');
        if (header) {
            // Create the button
            const btn = document.createElement('button');
            btn.className = "text-sm md:text-base btn cursor-pointer text-sm";
            btn.style.maxWidth = "173px";
            btn.style.marginLeft = "10px";
            btn.style.marginTop = "-7.6px";

            // Create the SVG element for the download icon
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("width", "1em");
            svg.setAttribute("height", "1em");
            svg.setAttribute("viewBox", "0 0 32 32");
            svg.style.marginRight = "8px";
            svg.style.height = "13px";

            // Create the path element for the SVG
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("fill", "currentColor");
            path.setAttribute("d", "M26 24v4H6v-4H4v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4zm0-10l-1.41-1.41L17 20.17V2h-2v18.17l-7.59-7.58L6 14l10 10l10-10z");

            // Append the path to the SVG, and the SVG and text to the button
            svg.appendChild(path);
            btn.appendChild(svg);
            btn.appendChild(document.createTextNode(" Download all files"));

            // On button click, download all files based on type
            btn.onclick = async () => {
                // Initialize variables for type, author, and name
                let type, author, name;

                // Parse the URL to determine the type and extract the author and name
                const urlSegments = location.pathname.split('/').slice(1);
                if (urlSegments[0] === "spaces" || urlSegments[0] === "datasets") {
                    [type, author, name] = urlSegments.slice(0, 3);
                } else {
                    [author, name] = urlSegments.slice(0, 2);
                    type = "models";
                }

                let apiUrl, files;

                // Determine the type (Model, Dataset, Space) and set apiUrl accordingly
                if (type === "spaces") {
                    apiUrl = `https://huggingface.co/api/spaces/${author}/${name}`;
                } else if (type === "datasets") {
                    apiUrl = `https://huggingface.co/api/datasets/${author}/${name}`;
                } else {
                    apiUrl = `https://api-inference.huggingface.co/models/${author}/${name}`;
                }

                let response = await fetch(apiUrl);
                let data = await response.json();

                // Check if data.siblings is defined before proceeding
                if (data.siblings) {
                    files = data.siblings.map(s => s.rfilename);
                    downloadAllFiles(files, author, name);
                } else {
                    console.error("data.siblings is undefined. Could not proceed with downloading files.");
                }
            };


            // Append the button to the header
            header.appendChild(btn);
        }
    };

    addButton();
})();