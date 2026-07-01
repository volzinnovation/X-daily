const assert = require("node:assert/strict");

const {
  buildDigestArchiveEntry,
  createDigestExport,
  filterArchiveEntries,
  sortArchiveEntries,
  topKeywords,
} = require("../extension/archive.js");

const posts = [
  {
    handle: "@launchwatch",
    timestamp: "2026-07-01T08:00:00Z",
    clean_text: "Launch reliability improved after a reusable engine inspection milestone.",
  },
  {
    handle: "gridnotes",
    timestamp: "2026-07-01T09:00:00Z",
    clean_text: "Grid reliability teams confirmed storage dispatch changes for the evening ramp.",
  },
  {
    handle: "@aiproductnotes",
    timestamp: "2026-07-01T10:00:00Z",
    clean_text: "AI evaluation dashboards now combine latency, cost, and user correction signals.",
  },
];

const clusters = {
  0: [posts[0], posts[1]],
  1: [posts[2]],
};

const entry = buildDigestArchiveEntry({
  posts,
  clusters,
  newsletter: "<div>Digest</div>",
  source: "demo",
  generatedAt: "2026-07-01T10:15:00Z",
});

assert.equal(entry.source, "demo");
assert.equal(entry.postCount, 3);
assert.equal(entry.accountCount, 3);
assert.equal(entry.clusterCount, 2);
assert.deepEqual(entry.topHandles, ["@launchwatch", "@gridnotes", "@aiproductnotes"]);
assert(entry.topKeywords.includes("reliability"));
assert(entry.clusterSummaries[0].priorityScore >= entry.clusterSummaries[1].priorityScore);
assert.equal(entry.clusterSummaries[0].postCount, 2);

assert.equal(topKeywords(posts, 2)[0], "reliability");

const olderEntry = { ...entry, id: "old", generatedAt: "2026-06-30T10:15:00Z" };
assert.equal(sortArchiveEntries([olderEntry, entry])[0].id, entry.id);
assert.equal(filterArchiveEntries([entry], "dispatch").length, 1);
assert.equal(filterArchiveEntries([entry], "not-found").length, 0);

const exported = createDigestExport([
  {
    ...entry,
    topKeywords: ["<script>alert(1)</script>"],
    clusterSummaries: [
      {
        title: "<script>alert(1)</script>",
        postCount: 1,
        priorityScore: 42,
        excerpt: "safe excerpt",
      },
    ],
  },
]);
assert(exported.includes("X-Daily Digest Archive"));
assert(!exported.includes("<script>alert(1)</script>"));
assert(exported.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));

console.log("archive helpers ok");
