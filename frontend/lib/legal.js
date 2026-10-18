export const POLICY_VERSION = "2026-10-10";
export const operator = {
  name: "Shivam Parmar",
  email: "parmarshivam247@gmail.com",
};
export const policies = {
  privacy: {
    title: "Privacy policy",
    intro:
      "This notice explains the information used to run Community Help Hub. Read it before creating an account or sharing a notice.",
    sections: [
      [
        "Who runs the hub",
        "Community Help Hub is a neighbourhood mutual-aid project maintained by Shivam Parmar. Contact parmarshivam247@gmail.com for privacy requests, complaints, or accessibility support. No company registration or government affiliation is claimed.",
      ],
      [
        "Account information and purpose",
        "We collect your display name, email, password and neighbourhood to create your account, authenticate you, and help nearby members recognise you. Passwords are stored as hashes. Your name, area, avatar, credits and verification status may appear on public profiles. Use an area or PIN code, not your flat number or full home address.",
      ],
      [
        "Information you choose to share",
        "Notices, responses, reviews and optional photos support exchanges. Public notices and associated images can be seen by visitors; private society notices and their attached photos are restricted to members, the uploader and authorised administrators. Profile photos and images attached to public notices are public. Unattached uploads require owner or administrator access. Do not upload confidential documents. Private chat is available to exchange participants and is stored on our server; it is not end-to-end encrypted. Authorised administrators may access records for moderation, support or a lawful request.",
      ],
      [
        "Optional phone and verification",
        "A phone number and profile photo are optional. Your phone is hidden from exchange participants unless you enable sharing. Community verification uses a society reference, not government-ID documents. Obtain permission before sharing another person's contact details. Email challenges, MFA settings and consent records support security and verification. A badge or verification mark does not guarantee identity, safety or professional qualifications.",
      ],
      [
        "Alerts, billing and technical data",
        "In-app notices support your exchanges. Email alerts are optional and can be disabled under Account → Notifications; authentication emails are separate. Test checkout records your selected plan, amount, invoice identifier and a snapshot of your account name/email, purchase date, validity and allowance. It takes no money and collects no card or bank details. Test invoice emails are transactional, separate from optional alerts, and wait for email verification and a configured provider. Billing shows queue, failure and provider-accepted status; acceptance does not guarantee inbox delivery. Hosting providers process network information such as IP addresses, browser details and request logs. The app uses short-lived, hashed rate-limit keys to reduce abuse.",
      ],
      [
        "Service providers and international processing",
        "Vercel hosts the frontend and Render hosts the API and database. Information can be processed outside India, including the Render region used by this deployment. An email delivery provider may process email addresses and message content when delivery is configured. We do not currently load advertising trackers, third-party analytics scripts, maps, video embeds or external font services. Society analytics are counts of activity, not a third-party tracking pixel.",
      ],
      [
        "Retention and your choices",
        "Account and exchange records currently remain until removed through moderation or an operator-assisted request; there is no automatic account-erasure schedule yet. Do not rely on free hosting to preserve data. Contact the operator from your account email to request access, correction, deletion, consent withdrawal or nomination support. We may ask for the minimum information needed to verify the request, and explain any legal preservation needs or impact on other participants. Never send passwords, OTPs or government IDs. You can edit your profile, hide your phone and disable optional alerts in Account. Withdrawing processing necessary for an account may require account closure.",
      ],
      [
        "Children, safety and changes",
        "Accounts are for people aged 18 or older. Signup requires an age declaration; it is not verified age assurance. Contact the operator if a child has registered or someone has shared your data without permission. Security measures reduce risk but cannot eliminate it. Material changes will be identified with an updated policy date and, where required, a renewed notice or consent.",
      ],
    ],
  },
  terms: {
    title: "Terms and conditions",
    intro:
      "Community Help Hub connects neighbours for voluntary help, giveaways and skills. These terms govern use of the platform; they do not remove rights protected by applicable law.",
    sections: [
      [
        "Eligibility and accounts",
        "You must be at least 18, provide accurate account information and keep your password and authenticator private. Do not impersonate people, create fake reviews or manipulate credits. The operator is Shivam Parmar; contact parmarshivam247@gmail.com.",
      ],
      [
        "Neighbour-to-neighbour exchanges",
        "No buying, selling or payments between neighbours are supported. You arrange and decide whether to accept an exchange. Check suitability and meet in a common area. The hub is not an emergency service, insurer, employer or provider of professional medical, legal or financial advice. Do not use it for urgent assistance; contact appropriate local services.",
      ],
      [
        "Content and conduct",
        "Do not post unlawful, discriminatory, threatening, sexually exploitative, fraudulent or infringing content, sensitive documents, personal data without permission, regulated or unsafe items, or misleading synthetic media. Label materially AI-generated or altered media and do not impersonate a real person. You keep ownership of your content and give the hub permission to store, display and moderate it to provide the service. You must have rights to uploaded images and permission from identifiable people.",
      ],
      [
        "Moderation, verification and reviews",
        "Spam filtering and community review can make mistakes. Use Report on a notice, or email the operator with the notice URL to request review or appeal. Verification means submitted evidence was reviewed; it is not a background check or a safety guarantee. Badge tiers reflect recorded credits. Reviews are user opinions, not endorsements by the operator. We may restrict accounts or remove content for abuse or legal obligations.",
      ],
      [
        "Listing order and demonstration content",
        "Paid-plan priority listings are labelled and can appear ahead of standard listings; filtering and recency also affect the board. Sample notices are labelled, fictional illustrations and cannot be accepted as real exchanges. Landing-page examples are illustrations, not customer testimonials.",
      ],
      [
        "Plans and cancellation",
        "Free plan limits are enforced by the API. Plus and Society amounts shown in INR are illustrative test prices. Checkout is a mock: no money is charged, no payment credentials are requested, and there is no automatic renewal. Test entitlements expire after their stated period; you can downgrade to Free in Account → Billing. Read the refund policy before changing plans. Real paid sales require a separately reviewed checkout, business disclosures and refund terms.",
      ],
      [
        "Availability and responsibility",
        "The service may be unavailable and features may change. We cannot guarantee an exchange, the accuracy of member content or preservation of data on demonstration hosting. Responsibility and any remedies depend on applicable law; these terms do not exclude non-excludable consumer rights, liability or legal protections. Indian law applies subject to mandatory rights and lawful jurisdiction; no exclusive court venue is imposed.",
      ],
      [
        "Contact and complaints",
        "For privacy, copyright, moderation or service complaints, email parmarshivam247@gmail.com with the relevant URL and a short description. Do not include unnecessary identity documents. Contact and operator details are available on the Contact page. These terms were updated on 10 October 2026.",
      ],
    ],
  },
  cookies: {
    title: "Cookie policy",
    intro:
      "The application currently uses essential session storage and a theme and language preferences, plus session-only hidden notices. It does not load optional analytics or advertising trackers.",
    sections: [
      [
        "Sign-in cookie",
        "In production, __Host-chh-session stores your authentication session. It is HttpOnly, Secure and SameSite=Strict, scoped to this website, and expires after one hour. Sign out clears it. Local development uses chh_session. Blocking this cookie prevents authenticated features from working; public pages remain available.",
      ],
      [
        "Language and hidden notices",
        "The chh-language cookie stores only your English, Gujarati or Hindi choice for up to one year. Hidden notice IDs are stored in sessionStorage for this browser tab, separately for each account. Closing the tab or restoring hidden posts clears that list. Hiding is not an account block and does not stop messages.",
      ],
      [
        "Theme preference",
        "chh-theme in your browser's local storage remembers light, dark or system theme on this device. It persists until changed or cleared in your browser. It contains no authentication token and is not sent to an analytics service.",
      ],
      [
        "Optional tracking and consent",
        "No optional tracking is currently implemented, so there is no optional-cookie acceptance banner. You do not need to accept advertising cookies to use the hub. If analytics, advertising, or third-party embeds are introduced, this policy and the applicable consent controls must be reviewed before they load. Necessary-session storage is separate from signup consent to process account information.",
      ],
      [
        "Browser controls and infrastructure",
        "You can clear cookies and local storage using your browser settings. This signs you out and resets the theme. Hosting providers also process operational request information described in the Privacy policy. Contact parmarshivam247@gmail.com with storage or privacy questions.",
      ],
    ],
  },
  refunds: {
    title: "Refund and cancellation policy",
    intro:
      "Checkout is currently a test flow. Community Help Hub does not collect real subscription payments or facilitate payments between neighbours.",
    sections: [
      [
        "No charge in test checkout",
        "Choosing Plus or Society creates a simulated invoice and test entitlement only. INR amounts are illustrative; they are not a receipt for money paid. Because no money is charged, there is no monetary test-payment refund. We do not request cards, bank details, UPI PINs or payment OTPs.",
      ],
      [
        "Change or cancel a test plan",
        "Open Account → Billing and choose Free to downgrade immediately. Existing monthly post usage is retained; downgrading does not reset quotas. Test plans do not automatically renew. A plan change does not promise that earlier test amounts will be credited.",
      ],
      [
        "Unexpected payment or billing error",
        "If someone claims to charge you for this test service, do not send further money. Email parmarshivam247@gmail.com with a description and transaction reference, without passwords or full card details, and contact your payment provider if a real unauthorised payment occurred. Applicable consumer remedies are not waived.",
      ],
      [
        "Before paid subscriptions launch",
        "Real paid checkout is not available under this policy. Before accepting payments, the operator must publish verified business and grievance details, final tax-inclusive pricing, renewal and cancellation rules, eligibility for refunds, and actual processing times. Those terms must be shown before payment. Neighbour-to-neighbour help remains free.",
      ],
    ],
  },
  accessibility: {
    title: "Accessibility",
    intro:
      "We are improving Community Help Hub for keyboard, screen-reader and mobile use. We do not claim certified WCAG conformance.",
    sections: [
      [
        "Available controls",
        "Use Skip to content to reach the main page. Forms have labels and visible focus indicators; dialogs use keyboard-accessible Radix controls. Light and dark themes, reduced-motion preferences and text alternatives support different needs.",
      ],
      [
        "Report a barrier",
        "Email parmarshivam247@gmail.com with the page URL, what prevented you from using it, and your browser or assistive technology if comfortable sharing. Do not include private account credentials. Manual screen-reader, zoom and device testing is still needed.",
      ],
    ],
  },
};
