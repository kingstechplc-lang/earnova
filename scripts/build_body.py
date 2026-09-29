#!/usr/bin/env python3
"""
PageNova — Refined Architecture Specification
Body PDF generator (ReportLab). Cover is generated separately via Playwright
and merged via pypdf.
"""
import os, sys, hashlib, platform
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether,
    Table, TableStyle, CondPageBreak, Flowable, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ─────────────────────────────────────────────────────────────────────────────
# 1. FONT REGISTRATION
# ─────────────────────────────────────────────────────────────────────────────
_IS_MAC = platform.system() == 'Darwin'
FONT_DIR = os.path.expanduser('~/.openclaw/workspace/fonts') if _IS_MAC else '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC',      f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif',           f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold',       f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic',     f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('FreeSerif',   normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans',  normal='DejaVuSans', bold='DejaVuSans')

# Install font fallback for mixed CJK/Latin
PDF_SKILL_DIR = '/home/z/my-project/skills/pdf'
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, 'scripts'))
try:
    from pdf import install_font_fallback
    install_font_fallback()
except Exception:
    pass  # English-only document; fallback optional

# ─────────────────────────────────────────────────────────────────────────────
# 2. PALETTE (from palette.cascade --seed 7, minimal mode)
# ─────────────────────────────────────────────────────────────────────────────
PAGE_BG       = colors.HexColor('#eff0f1')
SECTION_BG    = colors.HexColor('#f0f1f2')
CARD_BG       = colors.HexColor('#e4e7e8')
TABLE_STRIPE  = colors.HexColor('#ebedee')
HEADER_FILL   = colors.HexColor('#334650')
COVER_BLOCK   = colors.HexColor('#5a7886')
BORDER        = colors.HexColor('#b8c8cf')
ICON          = colors.HexColor('#52798c')
ACCENT        = colors.HexColor('#3681a6')
ACCENT_2      = colors.HexColor('#b43a4e')
TEXT_PRIMARY  = colors.HexColor('#1a1b1c')
TEXT_MUTED    = colors.HexColor('#6f7578')
SEM_SUCCESS   = colors.HexColor('#46875c')
SEM_WARNING   = colors.HexColor('#a18347')
SEM_ERROR     = colors.HexColor('#92453e')
SEM_INFO      = colors.HexColor('#466a8e')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ─────────────────────────────────────────────────────────────────────────────
# 3. STYLES
# ─────────────────────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
LEFT_M  = 0.85 * inch
RIGHT_M = 0.85 * inch
TOP_M   = 0.85 * inch
BOT_M   = 0.85 * inch
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

H1 = ParagraphStyle(
    name='H1', fontName='FreeSerif-Bold', fontSize=20, leading=26,
    textColor=HEADER_FILL, spaceBefore=18, spaceAfter=10, alignment=TA_LEFT,
)
H2 = ParagraphStyle(
    name='H2', fontName='FreeSerif-Bold', fontSize=14, leading=20,
    textColor=HEADER_FILL, spaceBefore=14, spaceAfter=6, alignment=TA_LEFT,
)
H3 = ParagraphStyle(
    name='H3', fontName='FreeSerif-Bold', fontSize=11.5, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=4, alignment=TA_LEFT,
)
BODY = ParagraphStyle(
    name='Body', fontName='FreeSerif', fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=8,
    alignment=TA_JUSTIFY, firstLineIndent=0,
)
BODY_NOINDENT = ParagraphStyle(
    name='BodyNI', parent=BODY, alignment=TA_LEFT, firstLineIndent=0,
)
BULLET = ParagraphStyle(
    name='Bullet', fontName='FreeSerif', fontSize=10.5, leading=15,
    textColor=TEXT_PRIMARY, leftIndent=18, bulletIndent=4,
    spaceBefore=0, spaceAfter=4, alignment=TA_LEFT,
)
CODE = ParagraphStyle(
    name='Code', fontName='DejaVuSans', fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, leftIndent=14, rightIndent=14,
    backColor=CARD_BG, borderColor=BORDER, borderWidth=0.5,
    borderPadding=8, spaceBefore=6, spaceAfter=10, alignment=TA_LEFT,
)
CALLOUT = ParagraphStyle(
    name='Callout', fontName='FreeSerif-Italic', fontSize=10, leading=15,
    textColor=HEADER_FILL, leftIndent=18, rightIndent=18,
    spaceBefore=8, spaceAfter=10, alignment=TA_LEFT,
    borderColor=ACCENT, borderWidth=0, borderPadding=8,
    backColor=SECTION_BG,
)
TABLE_HDR_STYLE = ParagraphStyle(
    name='THdr', fontName='FreeSerif-Bold', fontSize=9.5, leading=13,
    textColor=colors.white, alignment=TA_LEFT,
)
TABLE_CELL_STYLE = ParagraphStyle(
    name='TCell', fontName='FreeSerif', fontSize=9, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
TABLE_CELL_BOLD = ParagraphStyle(
    name='TCellB', fontName='FreeSerif-Bold', fontSize=9, leading=13,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
CAPTION = ParagraphStyle(
    name='Cap', fontName='FreeSerif-Italic', fontSize=9, leading=12,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=10,
)
TOC_H1 = ParagraphStyle(name='TOC1', fontName='FreeSerif-Bold', fontSize=11.5,
                        leading=18, leftIndent=10, textColor=TEXT_PRIMARY)
TOC_H2 = ParagraphStyle(name='TOC2', fontName='FreeSerif', fontSize=10,
                        leading=14, leftIndent=28, textColor=TEXT_MUTED)
TOC_TITLE = ParagraphStyle(name='TOCTitle', fontName='FreeSerif-Bold',
                            fontSize=22, leading=28, textColor=HEADER_FILL,
                            alignment=TA_LEFT, spaceAfter=20)

# ─────────────────────────────────────────────────────────────────────────────
# 4. HELPERS
# ─────────────────────────────────────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text  = getattr(flowable, 'bookmark_text', '')
            key   = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_heading(text, style, level=0):
    key = 'h_' + hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

MAX_KEEP_H = A4[1] * 0.4
def safe_keep(elements):
    total = 0
    for el in elements:
        try:
            _, h = el.wrap(CONTENT_W, A4[1])
            total += h
        except Exception:
            total += 30
    if total <= MAX_KEEP_H:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    else:
        return list(elements)

def make_table(rows, col_ratios, header=True, caption=None):
    """rows: list of list of strings. col_ratios sum to 1.0."""
    col_widths = [r * CONTENT_W for r in col_ratios]
    data = []
    for r_idx, row in enumerate(rows):
        new_row = []
        for cell in row:
            if r_idx == 0 and header:
                new_row.append(Paragraph('<b>%s</b>' % cell, TABLE_HDR_STYLE))
            else:
                new_row.append(Paragraph(cell, TABLE_CELL_STYLE))
        data.append(new_row)
    tbl = Table(data, colWidths=col_widths, hAlign='CENTER', repeatRows=1 if header else 0)
    style_cmds = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
    ]
    if header:
        style_cmds += [
            ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
            ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
        ]
        for i in range(1, len(rows)):
            bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    tbl.setStyle(TableStyle(style_cmds))
    out = [Spacer(1, 12), tbl]
    if caption:
        out += [Spacer(1, 4), Paragraph(caption, CAPTION)]
    out += [Spacer(1, 14)]
    return out

def callout(text):
    return Paragraph(text, CALLOUT)

def code_block(text):
    # Replace newlines with <br/> for ReportLab
    safe = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    safe = safe.replace('\n', '<br/>')
    return Paragraph(safe, CODE)

# ─────────────────────────────────────────────────────────────────────────────
# 5. STORY BUILD
# ─────────────────────────────────────────────────────────────────────────────
story = []

# ── TOC PAGE ──
story.append(Paragraph('Table of Contents', TOC_TITLE))
story.append(HRFlowable(width='100%', thickness=1.2, color=ACCENT, spaceAfter=18))
toc = TableOfContents()
toc.levelStyles = [TOC_H1, TOC_H2]
story.append(toc)
story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 1: EXECUTIVE SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 1 &nbsp;·&nbsp; Executive Summary', H1, level=0))

story.append(Paragraph(
    'This document refines the PageNova architecture by resolving six open '
    'issues raised during the original concept review. Each issue is addressed with a '
    'concrete architectural decision, the data model changes required to support it, '
    'and the operational controls that must accompany it. The objective is to convert '
    'the original concept from a defensible idea into an implementable engineering '
    'specification that an engineering team can build against without further '
    'clarification rounds.', BODY))

story.append(Paragraph(
    'The six issues are: (1) ad-network co-display rules, where Adsterra and Monetag '
    'impose restrictions on competitive ads, ad density, and content adjacency that the '
    'placement engine must enforce; (2) GDPR/CCPA cookie consent, where the platform '
    'becomes jointly liable for ad-tag cookies set on user pages and must integrate an '
    'IAB TCF v2.2-certified Consent Management Platform; (3) traffic-quality scoring, '
    'where the proposed Trust Score must be backed by real signals rather than '
    'aesthetic placeholders; (4) the platform-side revenue model, where the original '
    'concept left the buyer-side economics undefined; (5) earnings-claim compliance '
    'language, where the "Earn Money" framing creates implied-earnings exposure under '
    'FTC and analogous regimes; and (6) account lifecycle and offboarding, where the '
    'system must handle banned ad-network accounts, GDPR right-to-erasure requests, '
    'and platform-initiated suspensions without leaving orphaned ad code on live pages.', BODY))

story.append(Paragraph(
    'The unifying architectural principle is strict separation between the User Ad '
    'Engine and the Platform Ad Engine, with the Consent Layer as the single gate '
    'through which both must pass. This separation is what makes the business model '
    'defensible: the platform never pays users, never processes ad payouts, and never '
    'becomes the regulatory counterparty for the user\'s ad-network relationship. The '
    'platform\'s role is infrastructure, moderation, and discovery — not financial '
    'intermediation.', BODY))

story.append(add_heading('1.1 &nbsp;What changes from the original concept', H2, level=1))
story.append(Paragraph(
    'The original concept proposed a "PAGENOVA" platform with an "Earn '
    'Money" dashboard button, an ad-placement engine that allowed user ads and platform '
    'ads to coexist on the same page without constraint, a Trust Score field with no '
    'defined inputs, and no specified offboarding flow. Each of these is addressed in '
    'the chapters that follow, but the headline changes are: the dashboard button is '
    'renamed "Monetization"; the ad-placement engine becomes a policy-driven component '
    'that consults per-network compatibility rules before rendering; the Trust Score '
    'is decomposed into five sub-scores each backed by specific signal sources; and '
    'every ad integration is registered with a lifecycle state machine that handles '
    'disabling, revocation, and deletion as first-class operations.', BODY))

story.append(add_heading('1.2 &nbsp;What does not change', H2, level=1))
story.append(Paragraph(
    'The core product thesis remains intact. The platform is still a global creator '
    'publishing and traffic-monetization infrastructure. Users still create Special '
    'Pages, publish content, share URLs, and optionally connect their own approved ad '
    'networks. Christmas 2026 remains the flagship launch campaign rather than the '
    'product identity. The page builder, content blocks, sharing engine, creator '
    'levels, traffic challenges, documentation center, and admin moderation tools '
    'described in the original concept are preserved without material change. The '
    'refinements here tighten the compliance and reliability of the monetization layer '
    'without altering the user-facing product surface area.', BODY))

story.append(callout(
    'Architectural invariant: User Ads and Platform Ads share page real estate but '
    'never share consent state, network account, or revenue flow. The Consent Layer '
    'is the only component permitted to gate either engine.'))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 2: AD-NETWORK CO-DISPLAY RULES
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 2 &nbsp;·&nbsp; Ad-Network Co-Display Rules', H1, level=0))

story.append(Paragraph(
    'The original concept assumed that user-supplied Adsterra or Monetag tags and '
    'platform-supplied ad inventory could be interleaved on the same Special Page '
    'without conflict. Web research and the published policies of both networks '
    'indicate that this assumption is partially correct but requires enforcement. '
    'Adsterra explicitly permits its ads to be displayed alongside Google AdSense '
    'and other ad networks on the same page, but publishers must avoid "excessive ads" '
    'and ensure placements do not conflict. Monetag similarly supports multiple ad '
    'formats simultaneously on a single site and allows other networks alongside, '
    'but imposes its own content and traffic rules that the platform cannot override.', BODY))

story.append(Paragraph(
    'The implication for the placement engine is that co-display is generally '
    'permitted but is not unconditional. The platform must enforce three classes of '
    'constraint: (a) ad-density caps to avoid the "excessive ads" trigger that '
    'Adsterra and most major ad networks prohibit; (b) per-network compatibility '
    'rules, since individual networks may prohibit specific competitive networks or '
    'specific creative formats adjacent to their own; and (c) content-adjacency rules, '
    'where ads must not be placed next to content categories that violate either '
    'network\'s publisher content policies.', BODY))

story.append(add_heading('2.1 &nbsp;Findings from publisher policies', H2, level=1))
story.append(Paragraph(
    'Adsterra\'s publisher documentation and several third-party analyses confirm that '
    'Adsterra ads can be shown alongside AdSense and other networks, but the publisher '
    'must avoid excessive ad placements and ensure placements do not conflict with '
    'AdSense policies when co-displayed. Monetag\'s documentation describes support '
    'for multiple simultaneous ad formats on a single site and does not impose a '
    'general exclusivity rule against other networks. However, both networks reserve '
    'the right to suspend publishers for low-quality traffic, prohibited content '
    'categories, or violation of their respective terms — and these suspensions are '
    'against the user\'s publisher account, not the platform.', BODY))

story.extend(make_table(
    [
        ['Constraint', 'Source', 'Platform enforcement'],
        ['No "excessive ads" on a single page',
         'Adsterra policy; general industry norm',
         'Cap total ad units per Special Page (default: 4); reject placements beyond cap'],
        ['Per-network competitive exclusions',
         'Per-network publisher ToS (varies)',
         'Maintain AdNetworkCompatibility table; placement engine consults it before rendering'],
        ['Content-adjacency restrictions',
         'Both networks prohibit certain content categories',
         'Page moderation state gates ad rendering; Restricted/Suspended pages serve no ads'],
        ['Traffic-quality requirements',
         'Adsterra: no bots/incentivized; Monetag: no spoofing/fraud',
         'Traffic-Quality sub-score below threshold disables ad rendering on the page'],
        ['Site-verification status',
         'Monetag requires website verification before serving zones',
         'User onboarding flow requires site verification step before integration approval'],
    ],
    col_ratios=[0.28, 0.32, 0.40],
    caption='Table 2.1 — Co-display constraints and platform enforcement points'
))

story.append(add_heading('2.2 &nbsp;Architectural decision: Policy-Driven Placement Engine', H2, level=1))
story.append(Paragraph(
    'The placement engine is redesigned as a policy-driven component rather than a '
    'simple slot renderer. When a Special Page is requested, the engine collects the '
    'set of intended ad placements (both user-supplied and platform-supplied), then '
    'consults a policy matrix to determine which placements may render together, in '
    'what order, and with what density. The policy matrix is admin-configurable so '
    'that changes in network rules can be propagated without code changes.', BODY))

story.append(Paragraph(
    'The policy matrix is stored as an AdNetworkCompatibility table mapping pairs of '
    'ad networks (including "Platform" as a synthetic network) to a compatibility '
    'verdict: ALLOWED, ALLOWED_WITH_LIMITS, or FORBIDDEN. When the engine encounters '
    'an ALLOWED_WITH_LIMITS verdict, it consults the associated limit record for '
    'maximum simultaneous units, minimum vertical separation, and required content '
    'class between the two placements. FORBIDDEN verdicts cause one of the two '
    'placements to be suppressed based on a priority order specified at the '
    'placement level.', BODY))

story.append(add_heading('2.3 &nbsp;Data model additions', H2, level=1))
story.append(code_block(
    'AdNetwork\n'
    '  id              Int       PK\n'
    '  code            String    unique  // "adsterra", "monetag", "platform"\n'
    '  displayName     String\n'
    '  integrationTypes String[]  // SCRIPT, DIRECT_LINK, NATIVE, BANNER, ...\n'
    '  requiresSiteVerification Bool\n'
    '  policyDocUrl    String?\n'
    '  status          AdNetworkStatus  // ACTIVE, DEPRECATED, BANNED\n'
    '\n'
    'AdNetworkCompatibility\n'
    '  id              Int       PK\n'
    '  networkA        AdNetwork FK\n'
    '  networkB        AdNetwork FK\n'
    '  verdict         CompatibilityVerdict  // ALLOWED, ALLOWED_WITH_LIMITS, FORBIDDEN\n'
    '  maxSimultaneousUnits Int?\n'
    '  minVerticalSeparationPx Int?\n'
    '  requiredContentClassBetween String?   // e.g. "user_content_min_200px"\n'
    '  notes           String?\n'
    '  updatedAt       DateTime\n'
    '\n'
    'AdPlacementPolicy   // global platform-level caps, applied after pairwise checks\n'
    '  id              Int       PK\n'
    '  maxAdUnitsPerPage       Int   // default 4\n'
    '  maxPlatformAdsPerPage   Int   // default 2\n'
    '  maxUserAdsPerPage       Int   // default 2\n'
    '  minContentBetweenAdsPx  Int   // default 200\n'
    '  updatedAt       DateTime'))

story.append(add_heading('2.4 &nbsp;Runtime placement algorithm', H2, level=1))
story.append(Paragraph(
    'When a Special Page is rendered, the placement engine executes the following '
    'sequence. First, it loads the page\'s intended placements sorted by priority. '
    'Second, it walks the list and for each placement, checks pairwise compatibility '
    'with every placement already accepted; if any pair is FORBIDDEN, the lower-'
    'priority placement is dropped. Third, it applies the global caps from '
    'AdPlacementPolicy (total units, platform units, user units, minimum content '
    'separation). Fourth, it renders the surviving placements in priority order, '
    'injecting spacer content blocks between them where required by the '
    'requiredContentClassBetween rule.', BODY))

story.append(callout(
    'Operational note: the compatibility table is the single point of truth for '
    'co-display rules. When Adsterra or Monetag updates their publisher ToS, the '
    'admin updates one row — no code deploy required. The placement engine reads '
    'the table on every render (cached with a 60-second TTL) so policy changes '
    'propagate within one minute.'))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 3: GDPR/CCPA CONSENT
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 3 &nbsp;·&nbsp; GDPR/CCPA Cookie Consent Architecture', H1, level=0))

story.append(Paragraph(
    'When users embed Adsterra or Monetag tags on their Special Pages, the resulting '
    'cookies and tracking pixels are set in the visitor\'s browser against the '
    'platform\'s domain. Under the General Data Protection Regulation (GDPR), consent '
    'must be prior, informed, specific, unambiguous, and revocable — implied consent '
    'is unacceptable. The California Consumer Privacy Act (CCPA), as amended by the '
    'CPRA, follows an opt-out model rather than an opt-in model but, with CPRA\'s '
    'dark-patterns rules fully in effect from January 2026, requires a functional '
    'and symmetric opt-out mechanism. The platform, as the controller of the page '
    'chrome and the entity that permits third-party ad tags to be embedded, is '
    'jointly liable for lawful consent collection.', BODY))

story.append(Paragraph(
    'The industry-standard mechanism for signaling consent to ad networks is the '
    'Interactive Advertising Bureau\'s Transparency and Consent Framework version '
    '2.2 (IAB TCF v2.2). Google requires publishers serving ads in the EU/UK to use '
    'a Google-certified CMP that integrates with TCF v2.2. Adsterra and Monetag both '
    'document compatibility with the TCF signal, meaning a correctly implemented CMP '
    'will suppress their tags until consent is granted, without requiring per-tag '
    'patching by the platform.', BODY))

story.append(add_heading('3.1 &nbsp;Required CMP integration', H2, level=1))
story.append(Paragraph(
    'The platform must integrate a CMP certified under IAB TCF v2.2. The CMP is '
    'embedded once in the Special Page chrome and exposes a JavaScript API '
    '(__tcfapi) that ad tags consult before executing. Certified CMPs that may be '
    'considered include Usercentrics, CookieYes, Seers, Pandectes, TrustArc, and '
    'Setupad; the choice depends on pricing model, regional coverage, and the '
    'specific TCF v2.2 features supported. The integration is platform-wide and '
    'not configurable per user — every Special Page renders the same CMP, with the '
    'same consent strings, signaling the same set of vendor consent purposes.', BODY))

story.extend(make_table(
    [
        ['CMP requirement', 'Why it matters', 'Implementation point'],
        ['IAB TCF v2.2 certified', 'Required by Google for EU/UK ad serving; recognized by Adsterra/Monetag',
         'Select only from IAB-certified list; verify annually'],
        ['Google-certified (if Google Ads used)', 'Required for Google Ads serving in EU/UK',
         'Cross-check Google\'s certified CMP list at integration time'],
        ['Per-vendor granular consent', 'Visitors must be able to consent per purpose and per vendor',
         'CMP configured with all active ad-network vendors registered'],
        ['Symmetric opt-out (no dark patterns)', 'CPRA 2026 enforcement; "Don\'t Sell" must be as easy as "Accept"',
         'Equal-weight buttons; no pre-ticked boxes; no "Continue" pressure'],
        ['Consent string persistence', 'Subsequent page loads must honor prior consent state',
         'CMP stores TC string in first-party cookie; platform reads on SSR'],
        ['Server-side signal forwarding', 'Some networks require server-to-server consent signals',
         'Platform forwards TC string in ad-tag request headers'],
    ],
    col_ratios=[0.28, 0.34, 0.38],
    caption='Table 3.1 — CMP integration requirements'
))

story.append(add_heading('3.2 &nbsp;Consent flow architecture', H2, level=1))
story.append(Paragraph(
    'The consent flow is implemented as a distinct architectural layer that sits '
    'between the page chrome and both ad engines. On initial page load, the server '
    'renders the Special Page with ad slots marked but no ad tags emitted. The CMP '
    'script loads synchronously in the document head, presents the consent banner '
    'if no prior consent string is found, and exposes __tcfapi. Once the visitor '
    'completes the consent flow (or if a valid prior consent string is detected), '
    'the CMP fires the consent-updated event; the platform\'s Ad Renderer listens '
    'for this event and emits the appropriate ad tags for each slot, with the TC '
    'string forwarded in the request.', BODY))

story.append(Paragraph(
    'For visitors outside GDPR/CCPA jurisdictions, the CMP still loads but operates '
    'in a default-grant mode governed by the visitor\'s IP-derived jurisdiction. This '
    'is a deliberate choice: it is cheaper to render the CMP everywhere than to '
    'maintain a separate code path that misses edge cases (VPN users, geoip database '
    'drift, new state privacy laws). The default-grant mode is logged so that '
    'auditors can verify the platform did not silently suppress consent collection '
    'for users who should have received it.', BODY))

story.append(code_block(
    '// Pseudocode: Special Page SSR consent flow\n'
    'function renderSpecialPage(page, visitor) {\n'
    '  const consentState = cmp.loadConsentString(visitor.id);\n'
    '  const jurisdiction = geoip.derive(visitor.ip);\n'
    '  const requiresConsent = ["EU", "UK", "CA", "VA", "CO", "CT"]\n'
    '                          .includes(jurisdiction);\n'
    '\n'
    '  return html`\n'
    '    <head>\n'
    '      <script src="cmp-loader.js" data-cmp-id="..."></script>\n'
    '    </head>\n'
    '    <body>\n'
    '      ${renderPageContent(page)}\n'
    '      ${AdSlot placements=[...page.placements]\n'
    '              gate=consentState\n'
    '              requiresConsent=requiresConsent\n'
    '              strategy="defer-until-consent"}\n'
    '    </body>\n'
    '  `;\n'
    '}'))

story.append(add_heading('3.3 &nbsp;Data model additions', H2, level=1))
story.append(code_block(
    'ConsentRecord   // immutable append-only log of consent state per visitor\n'
    '  id              Int       PK\n'
    '  visitorId       String    indexed  // first-party anonymous ID\n'
    '  tcString        Text      // IAB TCF v2.2 consent string\n'
    '  jurisdiction    String    // EU, UK, CA, OTHER\n'
    '  capturedAt      DateTime  indexed\n'
    '  expiresAt       DateTime  // 13 months per TCF v2.2\n'
    '  source          String    // "banner", "prior", "default_grant"\n'
    '\n'
    'AdNetworkVendorMapping   // maps platform ad networks to IAB TCF vendor IDs\n'
    '  id              Int       PK\n'
    '  adNetworkCode   String    FK AdNetwork.code\n'
    '  tcfVendorId     Int       // IAB GVL vendor ID\n'
    '  requiresConsentFor String[]  // "advertising", "analytics"\n'
    '  updatedAt       DateTime'))

story.append(callout(
    'Compliance note: the ConsentRecord table must be append-only. Updates create a '
    'new row with a later capturedAt timestamp; the most recent non-expired row '
    'governs the current consent state. This supports the GDPR right to demonstrate '
    'consent (Art. 7.1) and auditability of consent withdrawals.'))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 4: TRAFFIC QUALITY & BOT DETECTION
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 4 &nbsp;·&nbsp; Traffic Quality and Bot Detection', H1, level=0))

story.append(Paragraph(
    'The original concept proposed a "Trust Score" composed of Risk, Traffic Quality, '
    'Content Risk, Ad Risk, and Spam Risk sub-fields, but did not specify the signals '
    'feeding each. A score without defined inputs is theater: it cannot defend an '
    'account suspension decision, it cannot be audited, and it cannot be improved. '
    'This chapter specifies the signal stack that backs each sub-score, the tools '
    'used to acquire those signals, and the scoring algorithm that combines them.', BODY))

story.append(Paragraph(
    'Both Adsterra and Monetag explicitly prohibit bot traffic, incentivized '
    'traffic, spoofing, fraudulent traffic, and certain misleading or money-making '
    'content categories. Adsterra\'s security guidance identifies bot and '
    'incentivized traffic as prohibited and addresses malicious/fraudulent traffic '
    'patterns. Monetag likewise prohibits spoofing and fraudulent traffic. Because '
    'these prohibitions are against the user\'s publisher account, the platform\'s '
    'incentive to detect bad traffic early is twofold: to protect the platform\'s '
    'relationship with each network (a high rate of banned users reflects on the '
    'platform) and to protect users from being banned for activity the platform '
    'could have warned them about.', BODY))

story.append(add_heading('4.1 &nbsp;Signal stack', H2, level=1))
story.append(Paragraph(
    'Modern bot detection combines multiple techniques because no single signal is '
    'sufficient. Industry best practice, as documented by Imperva, Engagelab, and '
    'others, combines device fingerprinting, behavioral analysis, traffic analysis, '
    'and risk scoring. The platform adopts this layered approach, with each signal '
    'feeding one or more sub-scores. Signals are collected both at request time '
    '(synchronous, in the edge layer) and asynchronously (post-request, in the '
    'analytics pipeline).', BODY))

story.extend(make_table(
    [
        ['Sub-score', 'Signals', 'Source / tool'],
        ['Traffic Quality',
         'Bot score from edge; traffic-source diversity; geographic distribution; returning-visitor ratio; '
         'page-view-to-session ratio; click-through rate on placements',
         'Cloudflare Bot Management; first-party analytics; referrer validation'],
        ['Content Risk',
         'Page-content classification; flagged keywords; moderator decisions; user-report volume; '
         'appeal outcomes',
         'Internal content classifier; human moderators; user reports'],
        ['Ad Risk',
         'Click-velocity on ad placements; ad-click-to-pageview ratio; conversion rate anomalies; '
         'repeated identical IPs clicking ads; user\'s ad-network suspension history',
         'In-house click-fraud pipeline; ad-network webhooks'],
        ['Spam Risk',
         'Account age; URL creation velocity; URL-share velocity across social platforms; '
         'duplicate content fingerprint; known-spam-IP overlap',
         'Account analytics; share-engine logs; content fingerprinting'],
        ['Account Risk (composite)',
         'Weighted sum of the four sub-scores above plus account-standing modifiers '
         '(verification status, prior suspensions, payment-network standing)',
         'Computed nightly by the risk-scoring job'],
    ],
    col_ratios=[0.18, 0.50, 0.32],
    caption='Table 4.1 — Trust Score sub-scores and their signal sources'
))

story.append(add_heading('4.2 &nbsp;Scoring algorithm', H2, level=1))
story.append(Paragraph(
    'Each sub-score is a value in [0, 100] where 100 is best. The composite Trust '
    'Score is computed as a weighted sum: Traffic Quality 35%, Content Risk 20%, '
    'Ad Risk 25%, Spam Risk 15%, Account Risk modifiers 5%. Weights are admin-'
    'configurable and may be tuned without code changes. Sub-scores are recomputed '
    'nightly in batch for every active Special Page, and the composite Trust Score '
    'is written to the page\'s moderation state record. Critical signals (e.g. an '
    'ad-network webhook reporting account suspension) trigger an immediate '
    'out-of-band re-score and a moderation state transition.', BODY))

story.append(Paragraph(
    'Each sub-score is decomposed into signal-level data, so when a moderator '
    'inspects a page they can see not just "Traffic Quality = 42" but the underlying '
    'signals: 31% of traffic flagged as bot-like by edge; click-through rate 4× '
    'platform median; 87% of sessions from a single ASN. This decomposition is what '
    'makes the score auditable and what gives moderators the evidence needed to '
    'defend a suspension decision to the user.', BODY))

story.append(add_heading('4.3 &nbsp;Tools and integration points', H2, level=1))
story.append(Paragraph(
    'The platform should adopt a layered tool selection rather than relying on a '
    'single vendor. At the edge, Cloudflare Bot Management (or an equivalent such '
    'as Imperva or Akamai Bot Manager) provides the first-pass bot score on every '
    'request, before the application layer is hit. At the application layer, '
    'FingerprintJS (open-source or Pro edition) provides client-side device '
    'fingerprinting that catches headless browsers and persistent device-spoofing '
    'attempts. At the analytics layer, an in-house click-fraud pipeline processes '
    'ad-click events in near-real-time and flags suspicious velocity patterns.', BODY))

story.append(Paragraph(
    'Tool selection should not be over-engineered at launch. The MVP layer is '
    'Cloudflare Bot Management (which most production deployments already use for '
    'WAF) plus FingerprintJS open-source plus an in-house velocity check on ad '
    'clicks. This combination catches the majority of low-sophistication fraud '
    'patterns at minimal cost. The advanced patterns (click-farms with rotating '
    'residential IPs, ML-driven behavioral mimicry) require ML-based detection '
    'that should be deferred until traffic volume justifies the investment.', BODY))

story.append(add_heading('4.4 &nbsp;Moderation state transitions', H2, level=1))
story.append(Paragraph(
    'The Trust Score does not directly disable monetization. Instead, it drives '
    'the moderation state machine: a Special Page\'s state can be Pending, '
    'Approved, Restricted, Suspended, or Banned. Score thresholds trigger '
    'state transitions, but every transition is logged with the triggering '
    'signals, and any transition that affects monetization (Restricted and '
    'below) generates a user-facing notification with the reason and the appeal '
    'path. The state machine is designed so that automated state changes can '
    'be reversed by a human moderator without losing the audit trail.', BODY))

story.append(code_block(
    'TrustScore (snapshot per page, written nightly)\n'
    '  id              Int       PK\n'
    '  pageId          Page       FK\n'
    '  trafficQuality  Int        // 0-100\n'
    '  contentRisk     Int\n'
    '  adRisk          Int\n'
    '  spamRisk        Int\n'
    '  composite       Int        // weighted sum\n'
    '  signalBreakdown Json       // per-signal values for audit\n'
    '  computedAt      DateTime   indexed\n'
    '\n'
    'ModerationEvent   // append-only state-transition log\n'
    '  id              Int       PK\n'
    '  pageId          Page       FK\n'
    '  fromState       ModerationState\n'
    '  toState         ModerationState\n'
    '  reason          String\n'
    '  triggerSignals  Json       // copy of signals at transition time\n'
    '  triggeredBy     String    // "automated" or userId\n'
    '  createdAt       DateTime  indexed'))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 5: PLATFORM-SIDE REVENUE MODEL
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 5 &nbsp;·&nbsp; Platform-Side Revenue Model', H1, level=0))

story.append(Paragraph(
    'The original concept left the platform-side revenue model undefined beyond '
    '"platform ads run on eligible Special Pages." This chapter specifies four '
    'distinct revenue layers, the buyer-side economics of each, the decision '
    'matrix for revenue-share with users, and the incentive-alignment principles '
    'that prevent the revenue model from polluting the user-facing product.', BODY))

story.append(Paragraph(
    'The four revenue layers are: (1) direct platform ad inventory sold by the '
    'platform itself to advertisers, displayed on eligible Special Pages; (2) '
    'platform-supplied ad-network inventory (e.g. the platform running its own '
    'Adsterra or Monetag publisher account on platform-managed placements), '
    'distinct from user-supplied ad-network integrations; (3) sponsored '
    'placements where creators opt to be promoted in discovery surfaces; and '
    '(4) creator-tooling subscriptions for power features (advanced analytics, '
    'custom domains, premium themes, removal of platform ads on their own '
    'pages). Each layer has different economics, different compliance '
    'profiles, and different relationships to the user ad layer.', BODY))

story.append(add_heading('5.1 &nbsp;Revenue layer comparison', H2, level=1))
story.extend(make_table(
    [
        ['Layer', 'Buyer', 'Revenue type', 'User rev-share?', 'Conflict with user ads?'],
        ['Direct platform inventory',
         'Advertisers buying from platform sales team or self-serve portal',
         'CPM / CPC / fixed placement',
         'No (user ads run independently)',
         'No — co-exists via placement engine'],
        ['Platform ad-network inventory',
         'Adsterra / Monetag paying the platform\'s own publisher account',
         'CPM / revenue share from network',
         'No',
         'No — but capped by AdPlacementPolicy'],
        ['Sponsored discovery placements',
         'Creators paying for visibility in search/trending/explore',
         'Fixed fee per period; or bid-based',
         'N/A (the creator is the buyer)',
         'No'],
        ['Creator tooling subscriptions',
         'Creators paying monthly for premium features',
         'Recurring SaaS',
         'N/A',
         'Optional "remove platform ads" tier — only affects platform layer'],
    ],
    col_ratios=[0.20, 0.24, 0.18, 0.18, 0.20],
    caption='Table 5.1 — Four platform-side revenue layers'
))

story.append(add_heading('5.2 &nbsp;Rev-share decision: none, by default', H2, level=1))
story.append(Paragraph(
    'The original concept did not specify whether users receive a share of platform-'
    'ad revenue generated on their pages. The recommendation here is: no rev-share '
    'by default. Rationale: rev-share introduces payment processing, KYC, tax '
    'reporting, chargeback handling, and cross-border payout infrastructure — all '
    'of which are precisely the burdens the architecture was designed to avoid by '
    'making ad networks the party that pays users. Rev-share would convert the '
    'platform from infrastructure provider to financial intermediary, with the '
    'compliance surface that entails.', BODY))

story.append(Paragraph(
    'The alternative mechanism for incentivizing users to permit platform ads on '
    'their page is a creator-tooling reward: users who enable platform ads on '
    'their page receive access to premium features at no cost (advanced analytics, '
    'custom themes, removal of platform watermark, higher content-block limits). '
    'This is a benefit-in-kind exchange rather than a revenue share, and it '
    'avoids the regulatory surface of monetary payouts while still giving users '
    'a reason to opt in.', BODY))

story.append(add_heading('5.3 &nbsp;Incentive alignment', H2, level=1))
story.append(Paragraph(
    'Each revenue layer must be checked against three alignment tests before '
    'launch. First, does the layer create an incentive for the platform to act '
    'against the user\'s interest? Direct platform inventory sold to advertisers '
    'creates pressure to keep ad density high, which conflicts with user '
    'experience — this is mitigated by the AdPlacementPolicy caps. Second, does '
    'the layer create an incentive for users to act against the platform\'s '
    'interest? Creator tooling subscriptions create pressure to let paying users '
    'violate content policies — this is mitigated by making subscription status '
    'orthogonal to moderation state. Third, does the layer create an incentive '
    'for the platform to discriminate between users in ways that damage '
    'discovery? Sponsored discovery placements create pressure to demote non-'
    'paying creators in search ranking — this is mitigated by keeping sponsored '
    'slots visually and structurally separate from organic discovery.', BODY))

story.append(add_heading('5.4 &nbsp;Launch sequencing', H2, level=1))
story.append(Paragraph(
    'Not all four layers should launch at the same time. The recommended sequence '
    'is: Layer 2 (platform ad-network inventory) at launch, because it requires no '
    'sales infrastructure and generates revenue from day one with traffic the '
    'platform already has; Layer 1 (direct platform inventory) once monthly '
    'platform traffic justifies a sales motion, typically 6–12 months post-launch; '
    'Layer 4 (creator tooling subscriptions) once power-user behavior patterns '
    'emerge from analytics, typically 6–9 months post-launch; and Layer 3 '
    '(sponsored discovery placements) last, only after the discovery surfaces '
    'have enough organic traffic that sponsored placements have value, typically '
    '12+ months post-launch. Launching Layer 3 before discovery is mature creates '
    'a perverse incentive where the platform over-promotes sponsored content to '
    'manufacture the value proposition.', BODY))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 6: EARNINGS-CLAIM COMPLIANCE
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 6 &nbsp;·&nbsp; Earnings-Claim Compliance Language', H1, level=0))

story.append(Paragraph(
    'The original concept used "PAGENOVA" as the product name and '
    '"Earn Money" as the dashboard button label. Both create implied-earnings '
    'exposure under the U.S. Federal Trade Commission\'s endorsement rules '
    '(16 CFR Part 255) and analogous regimes in other jurisdictions. The FTC '
    'requires that earnings claims be substantiated by the same evidence that '
    'would be required if the advertiser made the claim directly, and that '
    'bloggers and endorsers are liable for misleading or unsubstantiated '
    'representations. The product name and UI labels are not exempt from these '
    'rules — the entire user-facing framing is examined for implied promises.', BODY))

story.append(Paragraph(
    'The compliance concern is not that the platform promises users a specific '
    'dollar amount. It is that the words "earn" and "earning" create an '
    'expectation of monetary return that the platform cannot guarantee, because '
    'earnings depend on factors entirely outside the platform\'s control: the '
    'user\'s ad-network approval, the user\'s traffic quality, the user\'s '
    'content quality, the ad network\'s payout rates, and the ad network\'s '
    'continued willingness to serve ads to the user\'s visitors. A platform '
    'that frames itself around "earning" while disclaiming any responsibility '
    'for actual earnings is in a structurally weak compliance position.', BODY))

story.append(add_heading('6.1 &nbsp;Recommended language changes', H2, level=1))
story.extend(make_table(
    [
        ['Original concept', 'Recommendation', 'Rationale'],
        ['"PAGENOVA"',
         '"PageNova" or "Creator Hub"',
         'Removes the earnings promise from the product name'],
        ['"Earn Money" button',
         '"Monetization" or "Ad Networks"',
         'Neutral descriptor of the feature, not an outcome'],
        ['"Earnings" dashboard section',
         '"External Network Stats" with link-out to provider dashboard',
         'Accurate: the platform is showing third-party data, not its own'],
        ['"Your earnings" labels',
         '"Your ad-network stats (provided by [Adsterra/Monetag])"',
         'Makes clear the source and disclaims platform responsibility'],
        ['Traffic-challenge rewards framed as "boost your earnings"',
         '"Grow your audience" with rewards in XP/badges/themes',
         'Reframes incentive around legitimate engagement, not ad-clicking'],
        ['Creator Levels described as "earning tiers"',
         '"Activity levels" with criteria based on engagement, not earnings',
         'Avoids implying that higher level = higher income'],
    ],
    col_ratios=[0.26, 0.34, 0.40],
    caption='Table 6.1 — Recommended language substitutions'
))

story.append(add_heading('6.2 &nbsp;Required disclaimers', H2, level=1))
story.append(Paragraph(
    'The platform must publish, and require users to acknowledge, a clear '
    'earnings disclaimer before they activate any ad integration. The disclaimer '
    'must state, at minimum: that the platform does not pay users; that earnings '
    'depend entirely on the user\'s ad-network relationship; that the platform '
    'cannot guarantee any specific level of earnings or any earnings at all; that '
    'ad-network approval, traffic quality, content quality, and ad-network payout '
    'rates are outside the platform\'s control; and that any statistics displayed '
    'on the platform are sourced from the ad network and are not the platform\'s '
    'own measurements of earnings. The disclaimer must be presented as a required '
    'step in the ad-integration onboarding flow, not buried in a terms-of-service '
    'document that users do not read.', BODY))

story.append(Paragraph(
    'The platform must also publish a separate content-policy statement that '
    'prohibits users from representing their page as a guaranteed earnings '
    'opportunity. Users who promote their Special Page externally with "earn '
    'money" framing, click-farm language, or "get paid to" messaging violate '
    'platform policy and must be subject to moderation action. This protects '
    'the platform from downstream liability for user misrepresentations and '
    'aligns with the ad networks\' own prohibitions on incentivized traffic.', BODY))

story.append(add_heading('6.3 &nbsp;Analytics display rules', H2, level=1))
story.append(Paragraph(
    'The platform must not display fabricated or estimated earnings numbers. If '
    'the ad network provides a verified API for earnings data, the platform may '
    'display that data with clear attribution to the source network. If the ad '
    'network does not provide a verified API, the platform must display only '
    'platform-side analytics (page views, visitors, traffic sources) and link '
    'the user to their ad-network dashboard for earnings information. The '
    'platform must not estimate earnings by multiplying page views by an '
    'assumed CPM, because such estimates can be construed as implied earnings '
    'claims and can diverge sharply from actual ad-network payouts.', BODY))

story.append(callout(
    'Compliance principle: the platform measures traffic. The ad network measures '
    'earnings. The platform never reports earnings as its own data. When in doubt, '
    'show less monetary framing and link out.'))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 7: ACCOUNT LIFECYCLE & OFFBOARDING
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 7 &nbsp;·&nbsp; Account Lifecycle and Offboarding', H1, level=0))

story.append(Paragraph(
    'The original concept did not specify what happens when an ad-network '
    'account is suspended, when a user deletes their platform account, when a '
    'user wants to switch networks, or when the platform bans a user. Each of '
    'these is a common operational event that must be handled by the ad-'
    'integration lifecycle state machine. Failing to handle them produces dead '
    'ad code on live pages, which is at best a UX bug and at worst a compliance '
    'violation (e.g. serving ads for a banned Adsterra account).', BODY))

story.append(Paragraph(
    'Under the General Data Protection Regulation, individuals have a right to '
    'erasure of their personal data (Article 17) and the right to withdraw '
    'consent for processing. This right is not absolute — the platform may '
    'retain data necessary for legal compliance, fraud prevention, or '
    'establishment/defense of legal claims — but the default behavior on '
    'account deletion must be deletion of personal data, not silent retention. '
    'User-generated content (Special Pages, posts) is a particular challenge: '
    'retention is necessary to honor the user\'s audience that has bookmarked '
    'or shared the page, but personal-data elements (profile information, '
    'analytics fingerprints) must be removed or anonymized.', BODY))

story.append(add_heading('7.1 &nbsp;Ad-integration lifecycle states', H2, level=1))
story.append(Paragraph(
    'Every user-supplied ad integration moves through a defined state machine. '
    'The state determines whether the integration\'s ad code is rendered on '
    'live pages, whether the integration can be edited, and what offboarding '
    'actions are required. States are: Draft (created but not submitted), '
    'PendingReview (submitted, awaiting platform review), Approved (live), '
    'Disabled (user-disabled or admin-disabled, but recoverable), Revoked '
    '(ad-network account suspended, integration not recoverable), and '
    'Deleted (user deleted the integration, code removed from all pages).', BODY))

story.extend(make_table(
    [
        ['State', 'Ad code rendered?', 'User can edit?', 'Transition triggers'],
        ['Draft', 'No', 'Yes', 'User submits for review'],
        ['PendingReview', 'No', 'No (locked)', 'Admin approves or rejects'],
        ['Approved', 'Yes (subject to placement engine)', 'Yes (re-review required)',
         'User disables; admin disables; ad-network webhook reports suspension'],
        ['Disabled', 'No', 'Yes (re-submit for review)',
         'User re-enables; user deletes; admin bans'],
        ['Revoked', 'No', 'No (integration is terminal)',
         'User deletes; admin cleans up'],
        ['Deleted', 'No (code purged from all pages)', 'No (record retained for audit)',
         'Terminal state'],
    ],
    col_ratios=[0.18, 0.27, 0.22, 0.33],
    caption='Table 7.1 — Ad-integration lifecycle state machine'
))

story.append(add_heading('7.2 &nbsp;Offboarding scenarios', H2, level=1))

story.append(add_heading('7.2.1 &nbsp;User\'s ad-network account is suspended', H3, level=2))
story.append(Paragraph(
    'When an ad network reports (via webhook or admin notification) that a user\'s '
    'publisher account has been suspended, the platform immediately transitions '
    'all of that user\'s integrations with that network to Revoked state. The '
    'placement engine stops rendering the integration\'s ad code on all of the '
    'user\'s pages within 60 seconds (the placement engine cache TTL). The user '
    'is notified with the reason provided by the network, and is informed that '
    'the integration is not recoverable through the platform; they must resolve '
    'the suspension directly with the network. If the suspension is resolved at '
    'the network level and the network re-verifies the user\'s site, the user '
    'must re-submit the integration through the standard onboarding flow — the '
    'platform does not auto-revive Revoked integrations.', BODY))

story.append(add_heading('7.2.2 &nbsp;User deletes their platform account', H3, level=2))
story.append(Paragraph(
    'Account deletion triggers a multi-step offboarding flow. First, all ad '
    'integrations are transitioned to Deleted state and their ad code is purged '
    'from all cached render outputs within 60 seconds. Second, all Special Pages '
    'are transitioned to a Tombstone state: the page URL returns a 410 Gone '
    'response for 30 days (to inform search engines and inbound links), then the '
    'page is fully removed. Third, personal data in the user profile is '
    'anonymized (name, email, avatar, biographical fields replaced with null or '
    '"deleted user"). Fourth, analytics events associated with the user are '
    'anonymized by replacing the userId with a hash that cannot be reversed. '
    'Fifth, financial records (if any subscription history exists) are retained '
    'for the period required by tax law, with personal-data fields stripped.', BODY))

story.append(add_heading('7.2.3 &nbsp;User wants to migrate from one network to another', H3, level=2))
story.append(Paragraph(
    'Migration is handled by enabling both integrations simultaneously during '
    'the transition period, then disabling the old one. Because the placement '
    'engine supports multiple integrations on the same page (subject to '
    'compatibility rules), the new integration can be approved and activated '
    'before the old one is disabled, eliminating any gap in monetization. The '
    'user must explicitly disable the old integration; the platform does not '
    'auto-disable based on inactivity, because ad-network accounts in good '
    'standing may legitimately have periods of zero traffic.', BODY))

story.append(add_heading('7.2.4 &nbsp;Platform bans a user', H3, level=2))
story.append(Paragraph(
    'Platform-initiated bans follow the same offboarding path as user-initiated '
    'deletion, with two exceptions. First, the user\'s pages are not tombstoned '
    'with a 410; they are immediately set to return a 403 Forbidden with a '
    'generic "page unavailable" message, to prevent the user from continuing to '
    'send traffic to a now-non-monetizable page. Second, the user\'s data is '
    'retained in full (not anonymized) for the period required by the platform\'s '
    'legal hold policy, typically 7 years, to support defense against any '
    'subsequent legal claim by the user. After the hold period, the data is '
    'anonymized under the same flow as user-initiated deletion.', BODY))

story.append(add_heading('7.3 &nbsp;Data retention policy', H2, level=1))
story.extend(make_table(
    [
        ['Data class', 'Default retention', 'On user deletion', 'Legal basis for retention'],
        ['User profile data', 'Account lifetime', 'Anonymized within 30 days',
         'GDPR Art. 17 — no longer necessary'],
        ['Special Page content', 'Account lifetime', 'Tombstone 30 days, then hard delete',
         'Honor inbound links; SEO cleanup'],
        ['Ad-integration records', 'Account lifetime + 7 years', 'Anonymized except audit fields',
         'Fraud prevention; ad-network audit obligations'],
        ['Consent records', '13 months (TCF v2.2 max)', 'Hard delete after expiry',
         'TCF v2.2; demonstrate consent under GDPR Art. 7.1'],
        ['Analytics events', '26 months', 'Anonymized (userId → hash)',
         'Aggregate trend analysis; no individual profiling after deletion'],
        ['Moderation events', 'Account lifetime + 7 years', 'Retained in full',
         'Defense against legal claims; demonstrate moderation decisions'],
        ['Financial records (subscriptions)', '7 years post-transaction', 'Retained in full',
         'Tax law; financial record-keeping requirements'],
    ],
    col_ratios=[0.20, 0.18, 0.30, 0.32],
    caption='Table 7.2 — Data retention policy by class'
))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 8: CONSOLIDATED DATA MODEL CHANGES
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 8 &nbsp;·&nbsp; Consolidated Data Model Changes', H1, level=0))

story.append(Paragraph(
    'The preceding chapters introduce a number of new tables and columns. This '
    'chapter consolidates them into a single reference, organized by the issue '
    'they address. The intent is to give the engineering team a complete '
    'migration plan: every new table, every new column, every new enum value, '
    'in one place, with the issue that drove the change noted alongside.', BODY))

story.append(add_heading('8.1 &nbsp;Issue 1 — Co-display rules', H2, level=1))
story.append(Paragraph(
    'New tables: AdNetwork, AdNetworkCompatibility, AdPlacementPolicy. New '
    'columns on existing tables: AdPlacement gains priority (Int) and '
    'contentClassRequired (String?) to support the placement engine\'s '
    'compatibility checks. New enum: CompatibilityVerdict '
    '(ALLOWED, ALLOWED_WITH_LIMITS, FORBIDDEN), AdNetworkStatus '
    '(ACTIVE, DEPRECATED, BANNED).', BODY))

story.append(add_heading('8.2 &nbsp;Issue 2 — Consent layer', H2, level=1))
story.append(Paragraph(
    'New tables: ConsentRecord, AdNetworkVendorMapping. New columns on '
    'existing tables: Visitor gains jurisdiction (String, derived from GeoIP) '
    'and consentState (FK to most recent ConsentRecord). The SpecialPage '
    'table gains requiresConsent (Bool, default true) and cmpConfigOverride '
    '(Json?, for per-page CMP customization, normally null).', BODY))

story.append(add_heading('8.3 &nbsp;Issue 3 — Trust Score', H2, level=1))
story.append(Paragraph(
    'New tables: TrustScore (snapshot per page, written nightly), '
    'ModerationEvent (append-only state-transition log), SignalSource '
    '(registry of signal providers and their config). The SpecialPage table '
    'gains moderationState (enum: Pending, Approved, Restricted, Suspended, '
    'Banned) replacing the previous simple Boolean isApproved field.', BODY))

story.append(add_heading('8.4 &nbsp;Issue 4 — Revenue model', H2, level=1))
story.append(Paragraph(
    'New tables: PlatformAdCampaign (for Layer 1 direct-sold inventory), '
    'PlatformAdNetworkIntegration (for Layer 2 platform\'s own ad-network '
    'account), SponsoredPlacement (for Layer 3 discovery sponsorship), '
    'CreatorSubscription (for Layer 4 creator tooling). The AdPlacement table '
    'gains source (enum: USER_INTEGRATION, PLATFORM_DIRECT, PLATFORM_NETWORK) '
    'so the placement engine knows which pool of inventory a given placement '
    'draws from.', BODY))

story.append(add_heading('8.5 &nbsp;Issue 5 — Compliance language', H2, level=1))
story.append(Paragraph(
    'No structural data model changes. UI string changes are managed through '
    'the i18n catalog. One new table is required: EarningsDisclaimerAck — a '
    'simple append-only log recording which users have acknowledged the '
    'earnings disclaimer, with timestamp and disclaimer version, to support '
    'audit defense.', BODY))

story.append(add_heading('8.6 &nbsp;Issue 6 — Lifecycle & offboarding', H2, level=1))
story.append(Paragraph(
    'The AdIntegration table (already present in the original concept) gains '
    'lifecycleState (enum: Draft, PendingReview, Approved, Disabled, Revoked, '
    'Deleted) replacing the previous simple status field. New tables: '
    'OffboardingJob (tracks multi-step offboarding flows, including the 30-day '
    'tombstone timer for deleted accounts), LegalHold (records the legal basis '
    'and expiry for retained data on banned users).', BODY))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 9: UPDATED ROLLOUT SEQUENCE
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 9 &nbsp;·&nbsp; Updated Rollout Sequence', H1, level=0))

story.append(Paragraph(
    'The original concept did not sequence the launch. This chapter proposes a '
    'three-phase rollout with explicit risk gates between phases. The objective '
    'is to launch with the minimum feature set that demonstrates the platform '
    'thesis, then add revenue layers and advanced moderation as traffic and '
    'team capacity justify. Each phase has a defined exit criterion; phases do '
    'not advance until exit criteria are met.', BODY))

story.append(add_heading('9.1 &nbsp;Phase 1 — Minimum viable platform (MVP)', H2, level=1))
story.append(Paragraph(
    'Phase 1 delivers the minimum feature set required to validate the thesis: '
    'users can create Special Pages, publish content, share URLs, and connect '
    'one supported ad network (Adsterra). Platform ads run via Layer 2 '
    '(platform\'s own Adsterra account) on eligible pages. The Consent Layer '
    'is live with a certified CMP. The Trust Score runs in shadow mode (computed '
    'but not acted on) for the first 60 days to allow calibration. Manual '
    'approval is required for every ad integration. Moderation is fully '
    'manual.', BODY))

story.extend(make_table(
    [
        ['Capability', 'Phase 1 status', 'Exit criterion'],
        ['Special Page creation', 'Live', '1,000 published pages'],
        ['Page builder (basic blocks)', 'Live', 'NPS > 30 from page creators'],
        ['Adsterra integration', 'Live (manual approval)', '50 approved integrations'],
        ['Monetag integration', 'Deferred to Phase 2', '—'],
        ['Platform ads (Layer 2)', 'Live', 'Platform CPM stable for 30 days'],
        ['Consent Layer (CMP)', 'Live (IAB TCF v2.2)', '0 consent-related compliance incidents'],
        ['Trust Score', 'Shadow mode', 'Calibration against manual review > 80% agreement'],
        ['Moderation', 'Fully manual', '24-hour median response time'],
        ['i18n', 'English only', '—'],
        ['Christmas 2026 campaign', 'Live as flagship campaign', '—'],
    ],
    col_ratios=[0.32, 0.30, 0.38],
    caption='Table 9.1 — Phase 1 capabilities and exit criteria'
))

story.append(add_heading('9.2 &nbsp;Phase 2 — Multi-network and moderation automation', H2, level=1))
story.append(Paragraph(
    'Phase 2 adds Monetag as a second supported network, with the placement '
    'engine\'s compatibility rules fully live. The Trust Score transitions '
    'from shadow mode to active: scores below threshold automatically transition '
    'pages to Restricted state, with moderator review of every automated '
    'transition for the first 90 days. Layer 4 (creator tooling subscriptions) '
    'launches with a basic tier. Internationalization expands to French, '
    'Spanish, and Portuguese.', BODY))

story.append(add_heading('9.3 &nbsp;Phase 3 — Direct sales and discovery', H2, level=1))
story.append(Paragraph(
    'Phase 3 launches Layer 1 (direct platform inventory sold by a platform '
    'sales team) and Layer 3 (sponsored discovery placements). The two are '
    'launched together because Layer 1 inventory becomes more valuable when '
    'sponsored discovery drives targeted traffic to specific pages, and Layer '
    '3 sponsored placements become more valuable when Layer 1 ad inventory '
    'demonstrates the platform\'s ability to convert traffic. By this point '
    'the Trust Score has been calibrated for 12+ months and automated '
    'moderation handles the bulk of routine decisions, with human moderators '
    'focused on appeals and edge cases. Internationalization adds Arabic, '
    'Hindi, Swahili, and German.', BODY))

story.append(PageBreak())

# ─────────────────────────────────────────────────────────────────────────────
# CHAPTER 10: REMAINING OPEN ITEMS
# ─────────────────────────────────────────────────────────────────────────────
story.append(add_heading('Chapter 10 &nbsp;·&nbsp; Remaining Open Items', H1, level=0))

story.append(Paragraph(
    'Resolving the six issues raised in the original review does not close every '
    'open question. The following items are flagged for future work but are '
    'not blocking for Phase 1 launch. They should be revisited as the platform '
    'matures and as operational experience reveals which of them are real '
    'constraints and which are theoretical concerns.', BODY))

story.append(add_heading('10.1 &nbsp;Ad-network API integration depth', H2, level=1))
story.append(Paragraph(
    'This document assumes the platform displays external ad-network stats '
    'with link-out to the ad-network dashboard, rather than integrating '
    'verified earnings APIs. If verified APIs become available and reliable, '
    'the analytics display rules in Chapter 6 should be revisited to allow '
    'tighter integration. This is a Phase 2+ consideration; Phase 1 should '
    'ship with link-out only.', BODY))

story.append(add_heading('10.2 &nbsp;Additional ad networks', H2, level=1))
story.append(Paragraph(
    'The architecture is designed to support additional ad networks beyond '
    'Adsterra and Monetag, but each new network requires (a) an entry in the '
    'AdNetwork table, (b) an IAB TCF vendor ID mapping, (c) compatibility '
    'rules against every existing network, and (d) integration-type support. '
    'The order in which networks are added should be driven by user demand '
    'rather than platform preference. Google AdSense is the obvious next '
    'candidate but its compliance requirements are stricter than Adsterra '
    'or Monetag and may necessitate additional placement-engine work.', BODY))

story.append(add_heading('10.3 &nbsp;Mobile app vs mobile web', H2, level=1))
story.append(Paragraph(
    'The original concept did not specify whether Special Pages are consumed '
    'primarily via mobile web or via a platform mobile app. The architecture '
    'assumes mobile web first, which simplifies the ad-network integration '
    '(ad tags work in web views; they do not work natively in mobile apps '
    'without an SDK). If a mobile app is added later, the in-app ad experience '
    'will require either an SDK integration per network or a webview-based '
    'fallback — neither is trivial and the decision should be deferred until '
    'mobile-app traffic justifies the investment.', BODY))

story.append(add_heading('10.4 &nbsp;Tax and reporting obligations for subscriptions', H2, level=1))
story.append(Paragraph(
    'Layer 4 (creator tooling subscriptions) introduces tax-reporting '
    'obligations that do not exist for the ad-supported layers. Depending on '
    'the jurisdictions of paying users, the platform may need to collect VAT, '
    'GST, or sales tax, and may need to file periodic returns in multiple '
    'jurisdictions. This is a Phase 2 concern (when Layer 4 launches) but '
    'should be scoped with a tax advisor before Phase 2 begins.', BODY))

story.append(add_heading('10.5 &nbsp;Content licensing and IP', H2, level=1))
story.append(Paragraph(
    'The original concept did not address how the platform handles content '
    'that infringes third-party intellectual property. User-uploaded images, '
    'videos, and music in Special Pages are a copyright liability if the '
    'platform does not have a DMCA-compliant takedown process. This is '
    'necessary infrastructure for any UGC platform operating in jurisdictions '
    'with safe-harbor provisions, and should be scoped before Phase 1 launch '
    'rather than added reactively after the first takedown request.', BODY))

# ─────────────────────────────────────────────────────────────────────────────
# BUILD
# ─────────────────────────────────────────────────────────────────────────────
OUTPUT_BODY = '/home/z/my-project/scripts/body.pdf'

def page_decorator(canvas, doc):
    """Footer with page number and document title."""
    canvas.saveState()
    canvas.setFont('FreeSerif', 8.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(LEFT_M, BOT_M / 2,
                       'PageNova — Refined Architecture v2.0')
    canvas.drawRightString(PAGE_W - RIGHT_M, BOT_M / 2,
                            'Page %d' % doc.page)
    # Thin footer rule
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(LEFT_M, BOT_M / 2 + 14, PAGE_W - RIGHT_M, BOT_M / 2 + 14)
    canvas.restoreState()

doc = TocDocTemplate(
    OUTPUT_BODY,
    pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M,
    title='PageNova — Refined Architecture v2.0',
    author='Z.ai',
    subject='Technical architecture refinement addressing 6 open issues',
)
doc.multiBuild(story, onFirstPage=page_decorator, onLaterPages=page_decorator)
print('Body PDF generated:', OUTPUT_BODY)
print('Pages:', doc.page)
