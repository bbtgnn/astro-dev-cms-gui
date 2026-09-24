<!-- Demo home for content.config + defineCms overlay -->

<main>
	<h1>Astro Dev CMS — overlay demo</h1>
	<p>
		Schema-first fixture: native <code>content.config</code> +
		<code>defineCms</code> overlay + <code>cms.components</code>. Dev route
		<code>/cms</code>.
	</p>
	<ul>
		<li>
			<a href="/cms"><strong>/cms</strong></a> — collections → entries →
			overlay labels / custom author name editor
		</li>
		<li><a href="/cms/api/ok">/cms/api/ok</a> — API heartbeat</li>
		<li><a href="/cms/api/collections">/cms/api/collections</a></li>
		<li><a href="/cms/api/collections/posts">/cms/api/collections/posts</a></li>
		<li>
			<a href="/cms/api/collections/posts/hello">/cms/api/collections/posts/hello</a>
		</li>
		<li>
			<a href="/cms/api/collections/authors/ada"
				>/cms/api/collections/authors/ada</a
			>
			— custom <code>AuthorNameEditor</code>
		</li>
		<li>
			<a href="/posts/hello"><strong>/posts/hello</strong></a> — real Astro
			preview route (ADR-0013)
		</li>
		<li>
			<a href="/image-demo">/image-demo</a> — cover image (original asset)
		</li>
		<li>
			<code>PUT</code> invalid → 400 (Astro/Zod Input still authoritative)
		</li>
	</ul>
</main>
