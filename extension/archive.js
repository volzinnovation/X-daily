// Local digest archive helpers for X-Daily.
(function attachArchiveHelpers(root) {
  const STOPWORDS = new Set([
    "about", "after", "again", "also", "from", "have", "into", "more",
    "that", "their", "there", "this", "with", "your", "and", "the", "for",
    "are", "but", "not", "was", "were", "will", "werden", "einer", "einem",
    "eine", "dass", "mit", "der", "die", "das", "und",
  ]);

  function textForPost(post) {
    return String(post.clean_text || post.original_text || post.text || "");
  }

  function normalizeHandle(handle) {
    const value = String(handle || "unknown").trim();
    if (!value) return "@unknown";
    return value.startsWith("@") ? value : `@${value}`;
  }

  function tokenize(text) {
    return String(text)
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")
      .split(/[^a-z0-9äöüß_]+/i)
      .map((word) => word.trim())
      .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  }

  function topKeywords(posts, limit = 5) {
    const counts = new Map();
    posts.forEach((post) => {
      tokenize(textForPost(post)).forEach((word) => {
        counts.set(word, (counts.get(word) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([word]) => word);
  }

  function uniqueHandles(posts) {
    return Array.from(new Set(posts.map((post) => normalizeHandle(post.handle))));
  }

  function latestTimestamp(posts) {
    const timestamps = posts
      .map((post) => Date.parse(post.timestamp))
      .filter((value) => Number.isFinite(value));
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps)).toISOString();
  }

  function stableHash(value) {
    let hash = 0;
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function clustersToArray(clusters) {
    if (Array.isArray(clusters)) {
      return clusters.map((cluster, index) => ({
        id: String(cluster.id || index),
        summary: cluster.summary || "",
        posts: Array.isArray(cluster.posts) ? cluster.posts : [],
      }));
    }

    return Object.entries(clusters || {}).map(([id, posts]) => ({
      id,
      summary: "",
      posts: Array.isArray(posts) ? posts : [],
    }));
  }

  function scoreCluster(posts) {
    const text = posts.map(textForPost).join(" ").toLowerCase();
    const signalWords = [
      "launch", "released", "milestone", "policy", "security", "pricing",
      "deadline", "changed", "confirmed", "evaluation", "reliability",
    ];
    const signal = signalWords.filter((word) => text.includes(word)).length;
    return Math.min(100, posts.length * 18 + signal * 8);
  }

  function summarizeCluster(cluster, index) {
    const posts = cluster.posts || [];
    const keywords = topKeywords(posts, 4);
    const handles = uniqueHandles(posts);
    const title = cluster.summary || (
      keywords.length > 0
        ? `Topic ${index + 1}: ${keywords.slice(0, 3).join(", ")}`
        : `Topic ${index + 1}`
    );

    return {
      id: String(cluster.id || index),
      title,
      keywords,
      handles: handles.slice(0, 5),
      accountCount: handles.length,
      postCount: posts.length,
      latestAt: latestTimestamp(posts),
      priorityScore: scoreCluster(posts),
      excerpt: textForPost(posts[0] || {}).slice(0, 180),
    };
  }

  function buildDigestArchiveEntry(input) {
    const posts = Array.isArray(input.posts) ? input.posts : [];
    const clusters = clustersToArray(input.clusters);
    const generatedAt = input.generatedAt || new Date().toISOString();
    const generatedDate = new Date(generatedAt);
    const dateLabel = Number.isNaN(generatedDate.getTime())
      ? generatedAt
      : generatedDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
    const clusterSummaries = clusters
      .map(summarizeCluster)
      .sort((a, b) => b.priorityScore - a.priorityScore || b.postCount - a.postCount);
    const handles = uniqueHandles(posts);
    const idSeed = [
      generatedAt.slice(0, 10),
      input.source || "live",
      posts.map((post) => `${post.handle}:${textForPost(post).slice(0, 48)}`).join("|"),
    ].join("|");

    return {
      schemaVersion: 1,
      id: `digest-${stableHash(idSeed)}`,
      source: input.source || "live",
      generatedAt,
      dateLabel,
      postCount: posts.length,
      accountCount: handles.length,
      clusterCount: clusterSummaries.length,
      topHandles: handles.slice(0, 8),
      topKeywords: topKeywords(posts, 8),
      clusterSummaries,
      newsletter: String(input.newsletter || ""),
    };
  }

  function sortArchiveEntries(entries) {
    return [...(entries || [])].sort((a, b) => {
      const left = Date.parse(a.generatedAt) || 0;
      const right = Date.parse(b.generatedAt) || 0;
      return right - left;
    });
  }

  function filterArchiveEntries(entries, query) {
    const needle = String(query || "").trim().toLowerCase();
    const sorted = sortArchiveEntries(entries);
    if (!needle) return sorted;

    return sorted.filter((entry) => {
      const haystack = [
        entry.dateLabel,
        entry.source,
        ...(entry.topHandles || []),
        ...(entry.topKeywords || []),
        ...(entry.clusterSummaries || []).flatMap((cluster) => [
          cluster.title,
          cluster.excerpt,
          ...(cluster.keywords || []),
          ...(cluster.handles || []),
        ]),
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createDigestExport(entries) {
    const rows = sortArchiveEntries(entries).map((entry) => `
      <section>
        <h2>${escapeHtml(entry.dateLabel)} · ${escapeHtml(entry.source)}</h2>
        <p>${entry.postCount} posts from ${entry.accountCount} accounts in ${entry.clusterCount} topics.</p>
        <p><strong>Signals:</strong> ${escapeHtml((entry.topKeywords || []).join(", ") || "none")}</p>
        <ol>
          ${(entry.clusterSummaries || []).map((cluster) => `
            <li>
              <strong>${escapeHtml(cluster.title)}</strong>
              <span>${cluster.postCount} posts · priority ${cluster.priorityScore}</span>
              <p>${escapeHtml(cluster.excerpt || "")}</p>
            </li>
          `).join("")}
        </ol>
      </section>
    `).join("");

    return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>X-Daily Digest Archive</title>
<style>
  body { font-family: system-ui, sans-serif; line-height: 1.5; max-width: 880px; margin: 40px auto; padding: 0 24px; color: #111827; }
  h1 { font-size: 34px; margin-bottom: 4px; }
  h2 { border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px; }
  li { margin: 14px 0; }
  span { color: #6b7280; display: block; font-size: 13px; margin-top: 2px; }
</style>
<h1>X-Daily Digest Archive</h1>
<p>Exported ${escapeHtml(new Date().toLocaleString("en-US"))}</p>
${rows || "<p>No digests saved.</p>"}
</html>`;
  }

  const api = {
    buildDigestArchiveEntry,
    createDigestExport,
    filterArchiveEntries,
    sortArchiveEntries,
    topKeywords,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.XDailyArchive = api;
})(typeof window !== "undefined" ? window : globalThis);
