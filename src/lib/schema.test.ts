import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addOns, carePlans, webTiers } from '../data/pricing.ts';
import { site } from '../data/site.ts';
import { dollars } from './money.ts';
import {
  addOnNamed,
  addOnOffer,
  buildGraph,
  careOffers,
  ids,
  tierOffers,
  type Node,
} from './schema.ts';

// Collects every '@id' that DEFINES a node (an object with an '@type'), so a
// plain { '@id': ... } reference is not counted as a duplicate.
function definedIds(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => definedIds(n, out));
  else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o['@id'] === 'string' && '@type' in o) out.push(o['@id']);
    Object.values(o).forEach((v) => definedIds(v, out));
  }
  return out;
}

const url = `${site.url}/work/stone-steps-50k/`;
const graph = buildGraph({
  url,
  title: 'Stone Steps 50K',
  description: 'A test page.',
  breadcrumbs: [
    { name: 'Work', path: '/work/' },
    { name: 'Stone Steps 50K', path: '/work/stone-steps-50k/' },
  ],
  extra: [{ '@context': 'https://schema.org', '@type': 'CreativeWork', '@id': `${url}#work` }],
  lowestPrice: Math.min(...webTiers.map((t) => t.priceFrom)),
});
const nodes = graph['@graph'] as Node[];

test('the graph has one @context and no nested ones', () => {
  assert.equal(graph['@context'], 'https://schema.org');
  assert.ok(nodes.every((n) => !('@context' in n)));
});

test('every node id is unique', () => {
  const all = definedIds(graph);
  assert.deepEqual(all, [...new Set(all)]);
});

test('the studio, website, person, page and breadcrumb nodes are all present', () => {
  const types = nodes.map((n) => n['@type']).flat();
  for (const t of [
    'ProfessionalService',
    'LocalBusiness',
    'WebSite',
    'Person',
    'WebPage',
    'BreadcrumbList',
    'CreativeWork',
  ]) {
    assert.ok(types.includes(t), `graph carries ${t}`);
  }
});

test('every { @id } reference points at a node in the graph', () => {
  const defined = new Set(definedIds(graph));
  const refs: string[] = [];
  const walk = (n: unknown) => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      const o = n as Record<string, unknown>;
      if (typeof o['@id'] === 'string' && !('@type' in o)) refs.push(o['@id']);
      Object.values(o).forEach(walk);
    }
  };
  walk(graph);
  for (const r of refs) assert.ok(defined.has(r), `${r} is defined`);
});

test('the studio keeps the phone exactly as site.ts has it', () => {
  const studio = nodes.find((n) => n['@id'] === ids.studio)!;
  assert.equal(studio.telephone, site.phone);
  assert.equal(studio.name, site.studioName);
});

test('nothing in the graph claims a rating or review', () => {
  const text = JSON.stringify(graph);
  assert.ok(!/aggregateRating|"review"|Review"/.test(text));
});

test('a page with no breadcrumbs gets no BreadcrumbList', () => {
  const g = buildGraph({ url: `${site.url}/`, title: 't', description: 'd', lowestPrice: 1 });
  const types = (g['@graph'] as Node[]).map((n) => n['@type']).flat();
  assert.ok(!types.includes('BreadcrumbList'));
});

test('tier offers equal the tier floors in pricing.ts', () => {
  const offers = tierOffers(webTiers);
  offers.forEach((o, i) => {
    const spec = o.priceSpecification as Record<string, unknown>;
    assert.equal(spec.minPrice, webTiers[i].priceFrom);
  });
});

test('add-on offers equal the numbers in the visible price string', () => {
  for (const addOn of addOns) {
    const spec = addOnOffer(addOn).priceSpecification as Record<string, unknown>;
    const [min, max] = dollars(addOn.price);
    assert.equal(spec.minPrice, min);
    assert.equal(spec.maxPrice, max);
  }
});

test('care offers equal the visible care prices and periods', () => {
  careOffers(carePlans).forEach((o, i) => {
    const spec = o.priceSpecification as Record<string, unknown>;
    assert.equal(`$${spec.price}`, carePlans[i].price);
    assert.equal(spec.unitCode, carePlans[i].period === '/yr' ? 'ANN' : 'MON');
  });
});

test('addOnNamed fails loudly on a renamed add-on', () => {
  assert.throws(() => addOnNamed(addOns, 'Not a real add-on'));
  assert.equal(addOnNamed(addOns, 'Photography').name, 'Photography');
});

test('a sector page is a CollectionPage with its breadcrumb, and other pages stay WebPage', () => {
  const page = `${site.url}/churches/`;
  const g = buildGraph({
    url: page,
    title: 't',
    description: 'd',
    breadcrumbs: [{ name: 'Churches', path: '/churches/' }],
    pageType: 'CollectionPage',
    lowestPrice: 1,
  });
  const webpage = (g['@graph'] as Node[]).find((n) => n['@id'] === `${page}#webpage`);
  assert.equal(webpage?.['@type'], 'CollectionPage');
  assert.deepEqual(webpage?.breadcrumb, { '@id': `${page}#breadcrumb` });
  const plain = buildGraph({ url: `${site.url}/`, title: 't', description: 'd', lowestPrice: 1 });
  const home = (plain['@graph'] as Node[]).find((n) => n['@id'] === `${site.url}/#webpage`);
  assert.equal(home?.['@type'], 'WebPage');
});
