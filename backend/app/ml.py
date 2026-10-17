"""
ML Plan implementation (see Notion spec section 11):
- Category classification: TF-IDF + Logistic Regression
- Spam: rule-based signals + classifier score
- Duplicate detection: cosine similarity of TF-IDF vectors, top-3 above threshold
"""
import re
from typing import List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity


DUPLICATE_THRESHOLD = 0.85

# ---- Seed training data for category classifier (small, MVP-quality) ----
_SEED = [
    ("leaking tap needs urgent plumber repair pipe water", "Help Requests"),
    ("broken door lock fix carpenter furniture repair", "Help Requests"),
    ("electrician needed fan wiring switch repair", "Help Requests"),
    ("need ride to railway station carpool share cab", "Help Requests"),
    ("looking for lift college to home vehicle share", "Help Requests"),
    ("need doctor appointment medicine urgent health checkup", "Help Requests"),
    ("first aid help injury hospital nearby medical emergency", "Help Requests"),
    ("need someone to help lift heavy furniture move", "Help Requests"),
    ("donate old clothes charity drive collection", "Donations & Giveaways"),
    ("fundraiser for flood victims donation needed", "Donations & Giveaways"),
    ("giving away unused furniture free pickup", "Donations & Giveaways"),
    ("surplus food available free for anyone in need", "Donations & Giveaways"),
    ("free books giveaway old textbooks available", "Donations & Giveaways"),
    ("math tutoring first year calculus help study", "Skill Offers"),
    ("need help physics assignment exam preparation tutor", "Skill Offers"),
    ("offering guitar lessons free of cost", "Skill Offers"),
    ("tool sharing drill and ladder available to borrow", "Skill Offers"),
    ("laptop repair tech help offering free service", "Skill Offers"),
    ("volunteers needed for blood donation camp event", "Skill Offers"),
    ("lost wallet id card found campus please contact", "Community Alerts"),
    ("found keys near library lost and found", "Community Alerts"),
    ("urgent water supply cut off in the area today", "Community Alerts"),
    ("road closed due to construction avoid this route", "Community Alerts"),
    ("power outage scheduled maintenance notice for residents", "Community Alerts"),
]


class MLEngine:
    def __init__(self):
        texts = [t for t, _ in _SEED]
        labels = [c for _, c in _SEED]
        self.vectorizer = TfidfVectorizer(stop_words="english")
        X = self.vectorizer.fit_transform(texts)
        self.classifier = LogisticRegression(max_iter=1000)
        self.classifier.fit(X, labels)

        # spam heuristics
        self.spam_keywords = [
            "click here", "free money", "guaranteed", "act now", "www.",
            "http://", "https://bit.ly", "earn from home", "crypto investment",
            "whatsapp me for cash", "loan approved instantly",
        ]

    def predict_category(self, text: str) -> str:
        vec = self.vectorizer.transform([text])
        return self.classifier.predict(vec)[0]

    def validate_post_quality(self, title: str, description: str) -> Tuple[bool, str]:
        """
        Validates that a new post is not bogus, numeric-only, or keyboard-mashed gibberish.
        Applies only to new posts (existing database records remain valid).
        """
        clean_title = (title or "").strip()
        clean_desc = (description or "").strip()

        # 1. Minimum length and word count
        title_words = [w for w in re.split(r"\s+", clean_title) if w]
        desc_words = [w for w in re.split(r"\s+", clean_desc) if w]

        if len(title_words) < 2 or len(clean_title) < 6:
            return False, "Title is too short. Please provide at least 2 descriptive words (minimum 6 characters)."

        if len(desc_words) < 4 or len(clean_desc) < 20:
            return False, "Description is too brief. Please provide at least 4 words (minimum 20 characters) explaining your request."

        # 2. Rejects purely numeric or symbol-heavy titles (e.g. '111', '123456')
        alpha_title = "".join(c for c in clean_title if c.isalpha())
        if len(alpha_title) < 3:
            return False, "Title must contain meaningful words, not just numbers or symbols."

        # 3. Repeated character spam (e.g. 'aaaaa', '11111', '.....')
        if re.search(r"(.)\1{3,}", clean_title) or re.search(r"(.)\1{4,}", clean_desc):
            return False, "Content contains repetitive characters. Please use natural language."

        # 4. Keyboard mashing / consonant cluster gibberish (e.g. 'abpotusgfasigasl', 'asdfghjkl')
        keyboard_patterns = ["qwerty", "asdfgh", "zxcvbn", "qazwsx", "12345", "lkjhgf"]
        lowered_full = f"{clean_title.lower()} {clean_desc.lower()}"
        for kp in keyboard_patterns:
            if kp in lowered_full:
                return False, "Content appears to contain keyboard-mashing. Please write a meaningful description."

        consonant_regex = re.compile(r"[bcdfghjklmnpqrstvwxz]{5,}", re.IGNORECASE)
        vowels = set("aeiouyAEIOUY")
        for word in title_words + desc_words:
            # Strip punctuation from word
            w = re.sub(r"[^a-zA-Z]", "", word)
            if len(w) >= 6:
                if consonant_regex.search(w):
                    return False, f"The word '{word}' appears to be gibberish or keyboard mashing. Please use real words."
                if not any(c in vowels for c in w):
                    return False, f"The word '{word}' contains no vowels. Please use real words."

        return True, ""

    def spam_check(self, text: str) -> Tuple[float, bool]:
        lowered = text.lower()
        score = 0.0
        for kw in self.spam_keywords:
            if kw in lowered:
                score += 0.3
        # excessive punctuation / caps as weak spam signal
        if len(re.findall(r"[A-Z]{5,}", text)) > 0:
            score += 0.15
        if text.count("!") >= 3:
            score += 0.15
        # very short low-content posts are slightly suspicious
        if len(text.strip()) < 8:
            score += 0.2
        score = min(score, 1.0)
        return round(score, 2), score >= 0.5

    def find_duplicates(
        self, text: str, existing: List[Tuple[int, str]]
    ) -> List[dict]:
        """existing: list of (post_id, title+description) for open posts."""
        if not existing:
            return []
        corpus = [text] + [t for _, t in existing]
        vec = TfidfVectorizer(stop_words="english")
        try:
            X = vec.fit_transform(corpus)
        except ValueError:
            return []
        sims = cosine_similarity(X[0:1], X[1:]).flatten()
        candidates = []
        for (post_id, _), sim in zip(existing, sims):
            if sim >= DUPLICATE_THRESHOLD:
                candidates.append({"post_id": post_id, "similarity": round(float(sim), 2)})
        candidates.sort(key=lambda c: -c["similarity"])
        return candidates[:3]


ml_engine = MLEngine()

