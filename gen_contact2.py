import sys, re, os

with open(r'c:\Users\garva\Downloads\5 TH JUNE (2) (1)\5 TH JUNE (2)\5 TH JUNE\4 TH JUNE\klyperix\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Find key structural positions
body_idx = c.index('<body>')
end_body = c.rindex('</body>')

# === HEAD section (0 to body_idx) ===
head = c[:body_idx]

# === BODY section: from <body> to inject_feedback (our added scripts) ===
# Find start of our custom scripts block (the inline slider script added by us)
# The framer-generated main content ends right after svg-templates div
# We need: the <body> opening + inline style fixes + main div with correct routeId + svg-templates + framer scripts
body_open = c[body_idx:body_idx+7]  # "<body>\n"

# Find the body style fixes (custom inline CSS after body)
body_style_start = c.index('<style>', body_idx)
body_style_end = c.index('</style>', body_style_start) + 8

# The #main div  
main_div_start = c.index('<div id="main"', body_idx)

# Find end of SSR content: the svg-templates div closes and then we have the framer script
svg_templates_start = c.index('<div id="svg-templates"', main_div_start)
svg_templates_end = c.index('</div>', svg_templates_start) + 6

# Find the <link rel="modulepreload" for framer bundle 
module_preload_idx = c.index('<link rel="modulepreload"', svg_templates_end)
# Find end of framer script block (after script_main)
framer_script_end = c.index('</script>', c.index('script_main')) + 9

# Extract just the framer bundle section
framer_bundle = c[module_preload_idx:framer_script_end]

# Extract opacity fix style + script
opacity_style_idx = c.index('<style>body{opacity:', svg_templates_end)
opacity_script_end = c.index('</script>', opacity_style_idx + 200)
while c[opacity_script_end-100:opacity_script_end+9].count('</script>') == 0:
    opacity_script_end = c.index('</script>', opacity_script_end + 1)
# Get the full opacity fix block  
opacity_block = c[opacity_style_idx:opacity_script_end + 9]

print('SSR content range:', main_div_start, 'to', svg_templates_end)
print('Framer bundle:', module_preload_idx, 'to', framer_script_end)
print('Opacity block found:', opacity_style_idx)

# === Build the contact page ===
# Replace all ./ with ../ in head
head_cp = head.replace('href="./', 'href="../').replace('src="./', 'src="../').replace('url("./', 'url("../')
# Remove augiA20Il (home page) SSR content from head? Actually head has no content references
# Fix title
head_cp = head_cp.replace(
    '<title>KLYPERIX PRODUTION - Video Editor &amp; Video Editing Agency Template</title>',
    '<title>Contact \u2014 KLYPERIX PRODUCTION</title>'
)

# The main div opener - with ZnAG3HaGV routeId, no SSR content
main_div_opener = c[main_div_start:c.index('>', main_div_start) + 1]
main_div_opener_cp = main_div_opener.replace('"augiA20Il"', '"ZnAG3HaGV"')

# The body opener style (inline CSS fix)
body_style = c[body_style_start:body_style_end]

# Framer bundle scripts (adjust paths)
framer_bundle_cp = framer_bundle.replace('src="./', 'src="../').replace('href="./', 'href="../')

# Opacity fix (adjust paths)
opacity_block_cp = opacity_block.replace('src="./', 'src="../').replace('href="./', 'href="../')

# Additional scripts (inject_feedback, api_client, preventFramerAutoplay)
# Find inject_feedback_button script
ib_idx = c.index('<script src="./inject_feedback_button.js', svg_templates_end)
ib_end = c.index('</script>', ib_idx) + 9
ib_script = c[ib_idx:ib_end].replace('src="./', 'src="../')

# api_client
api_idx = c.index('<script src="./public/api_client.js', svg_templates_end)
api_end = c.index('</script>', api_idx) + 9
api_script = c[api_idx:api_end].replace('src="./', 'src="../')

# preventFramerAutoplay  
pfa_idx = c.index('<script>function preventFramerAutoplay', svg_templates_end)
pfa_end = c.index('</script>', pfa_idx) + 9
pfa_script = c[pfa_idx:pfa_end]

# SVG templates section
svg_section = c[svg_templates_start:svg_templates_end]

# Assemble contact page
contact_html = (
    head_cp + '\n'
    + '<body>\n'
    + body_style + '\n'
    + main_div_opener_cp
    + '<style data-framer-html-style="">:root body{background:var(--token-d7def13e-f4d5-4c25-92c2-bbfe393f4b3e,#fff)}</style>'
    + '</div>\n'
    + svg_section + '\n'
    + framer_bundle_cp + '\n'
    + opacity_block_cp + '\n'
    + '<body>\n'
    + body_style + '\n'
    + ib_script + '\n'
    + api_script + '\n'
    + pfa_script + '\n'
    + '</body></html>\n'
    + '<!-- </body> -->\n'
)

print('Contact page size:', len(contact_html))
print('Has ZnAG3HaGV:', 'ZnAG3HaGV' in contact_html)
print('Has augiA20Il (SSR route ref):', 'augiA20Il' in contact_html)
print('Has ../ paths:', '../assets' in contact_html)
