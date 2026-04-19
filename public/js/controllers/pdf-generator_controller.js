import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static values = {
        wsUrl: String,
        statusUrl: String,
        generateUrl: String,
        baseUrl: String,
        doculinDomain: String,
    };

    static targets = ['button', 'status', 'content'];

    connect() {
        const initialJobRef = this.getJobRef();
        if (initialJobRef) {
            this.checkJobStatus(initialJobRef);
        }
    }

    disconnect() {
        this.closeSocket();
    }

    getJobRef() {
        return new URLSearchParams(window.location.search).get('ref');
    }

    setJobRef(ref) {
        const url = new URL(window.location);
        url.searchParams.set('ref', ref);
        window.history.pushState({}, '', url);
    }

    closeSocket() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    onJobCompleted(pdfUrl) {
        this.closeSocket();
        window.open(pdfUrl, '_blank');
        this.statusTarget.classList.add('d-none');
        this.statusTarget.classList.remove('d-flex');
        this.buttonTarget.disabled = false;
    }

    async generate() {
        const jobRef = this.getJobRef();
        if (jobRef) {
            this.checkJobStatus(jobRef);
            return;
        }

        this.buttonTarget.disabled = true;
        this.statusTarget.classList.remove('d-none');
        this.statusTarget.classList.add('d-flex');

        const pageStyles = Array.from(document.querySelectorAll('style'))
            .map((style) => style.innerHTML)
            .join('\n');

        const htmlContent = `
            <html>
                <head>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>${pageStyles}</style>
                    <style>
                        html, body {
                            margin: 0;
                            padding: 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="pdf-container">
                        ${this.contentTarget.innerHTML}
                    </div>
                </body>
            </html>
        `;

        try {
            const response = await fetch(this.generateUrlValue, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html: htmlContent }),
            });
            const data = await response.json();
            if (data.job_id) {
                this.setJobRef(data.job_id);
                this.listenForCompletion(data.job_id);
            }
        } catch (error) {
            console.error('PDF generation failed', error);
            this.buttonTarget.disabled = false;
            this.statusTarget.classList.add('d-none');
            this.statusTarget.classList.remove('d-flex');
        }
    }

    async checkJobStatus(jobId) {
        this.statusTarget.classList.remove('d-none');
        this.statusTarget.classList.add('d-flex');
        this.buttonTarget.disabled = true;

        try {
            const url = this.statusUrlValue.replace('{jobId}', jobId);
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'completed') {
                this.onJobCompleted(data.pdf_url);
            } else {
                this.listenForCompletion(jobId);
            }
        } catch (error) {
            console.error('Status check failed', error);
            this.statusTarget.classList.add('d-none');
            this.statusTarget.classList.remove('d-flex');
            this.buttonTarget.disabled = false;
        }
    }

    listenForCompletion(jobId) {
        this.closeSocket();

        const url = new URL(this.wsUrlValue);
        url.searchParams.set('jobId', jobId);

        this.socket = new WebSocket(url);
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'completed') {
                this.onJobCompleted(data.pdf_url);
            }
        };
        this.socket.onerror = (err) => {
            console.error('WebSocket error:', err);
        };
    }
}
