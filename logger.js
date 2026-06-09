(function() {
    // Listen for unhandled Javascript errors
    window.addEventListener('error', function(event) {
        logBug({
            type: 'javascript_error',
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error ? event.error.stack : null,
            userAgent: navigator.userAgent
        });
    });

    // Listen for unhandled Promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        logBug({
            type: 'promise_rejection',
            reason: event.reason ? event.reason.toString() : 'Unknown',
            userAgent: navigator.userAgent
        });
    });

    function logBug(metadata) {
        const API_BASE = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
            ? 'http://127.0.0.1:8000' : 'https://klyperix-backend.onrender.com'; // Adjust to actual production URL
            
        fetch(API_BASE + '/api/analytics/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_type: 'bug_report',
                page_path: window.location.pathname,
                metadata: metadata
            })
        }).catch(err => console.error("Failed to log bug report", err));
    }

    // Export logBug globally so it can be called manually for lag/crashes
    window.klyperixLogBug = logBug;
})();
