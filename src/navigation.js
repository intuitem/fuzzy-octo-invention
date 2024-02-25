import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Solutions',
      links: [
        {
          text: 'Ciso Assistant',
          href: getPermalink('/ciso-assistant'),
        },
        {
          text: 'Services',
          href: getPermalink('/services'),
        },
      ],
    },
    {
      text: 'Ressources',
      links: [
        {
          text: 'Trial',
          href: getPermalink('/trial'),
        },
        {
          text: 'Docs',
          href: 'https://intuitem.gitbook.io/product-docs/',
          skipUrlLocalization: true,
        },
        {
          text: 'Open Source',
          href: 'https://github.com/intuitem/',
          skipUrlLocalization: true,
        },
        {
          text: 'FAQ',
          href: getPermalink('/faq'),
        },
        {
          text: 'Support',
          href: getPermalink('/support'),
        },
        {
          text: 'Contact',
          href: getPermalink('/contact'),
        },

      ],
    },
    {
      text: 'Blog',
      href: getBlogPermalink(),
      skipUrlLocalization: true,

    },
  ],
  actions: [{ text: 'Community', href: 'https://github.com/intuitem/ciso-assistant-community', target: '_blank' }],
};

export const footerData = {
  links: [
    {
      title: 'Solutions',
      links: [
        { text: 'CISO Assistant', href: '/ciso-assistant' },
        { text: 'Use cases', href: '/ciso-assistant#use-cases' },
        { text: 'Pricing', href: '/pricing' },
        { text: 'Customization', href: '/customization' },
        { text: 'Services', href: '/services' },
      ],
    },
    {
      title: 'Ressources',
      links: [
        { text: 'Trial', href: '/trial' },
        { text: 'Blog', href: '#' },
        { text: 'Discord', href: '#' },
        { text: 'Contact', href: '#' },
        { text: 'Contrib', href: '#' },
      ],
    },
    {
      title: 'Support',
      links: [
        { text: 'Portal', href: '#' },
        { text: 'Docs', href: '#' },
        { text: 'Discord', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { text: 'About us', href: '#' },
        { text: 'Diversity', href: '#' },
        { text: 'Mission', href: '#' },
        { text: 'References', href: '#' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'LinkedIn', icon: 'tabler:brand-linkedin', href: 'https://www.linkedin.com/company/intuitem' },
    { ariaLabel: 'Discord', icon: 'tabler:brand-discord', href: 'https://discord.gg/qvkaMdQ8da' },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/intuitem' },
  ],
  footNote: `
    intuitem - SARL au capital de 100 000,00€ - 8 rue des freres caudron, 78140 Vélizy-Villacoublay - SIRET 84450819200029 RCS Versailles
  `,
};
