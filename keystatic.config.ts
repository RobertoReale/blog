import { config, collection, fields } from '@keystatic/core'
import { wrapper, block } from '@keystatic/core/content-components'

const storage: Parameters<typeof config>[0]['storage'] =
  process.env.NODE_ENV === 'development'
    ? { kind: 'local' }
    : {
        kind: 'github',
        repo: {
          owner: 'RobertoReale',
          name: 'blog',
        },
      };

export default config({
  storage,
  ui: {
    brand: { name: 'Blog Admin' },
  },
  collections: {
    articles: collection({
      label: 'Articles',
      slugField: 'title',
      path: 'src/content/articles/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({
          name: { label: 'Title' },
        }),
        date: fields.date({
          label: 'Date',
          validation: { isRequired: true },
        }),
        description: fields.text({
          label: 'Description',
          multiline: true,
          validation: { isRequired: true },
        }),
        tags: fields.array(
          fields.text({ label: 'Tag' }),
          {
            label: 'Tags',
            itemLabel: (props) => props.value || 'New tag',
          },
        ),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
          ],
          defaultValue: 'draft',
        }),
        language: fields.select({
          label: 'Language',
          options: [
            { label: 'English', value: 'en' },
            { label: 'Italian', value: 'it' },
          ],
          defaultValue: 'en',
        }),
        series: fields.text({
          label: 'Series',
          validation: { isRequired: false },
        }),
        part: fields.number({
          label: 'Part (in series)',
          validation: { isRequired: false },
        }),
        coverImage: fields.image({
          label: 'Cover Image',
          directory: 'public/images/articles',
          publicPath: '/images/articles/',
        }),
        origin: fields.text({
          label: 'Origin note',
          multiline: true,
          validation: { isRequired: false },
        }),
        originPosition: fields.select({
          label: 'Origin position',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' },
          ],
          defaultValue: 'bottom',
        }),
        sources: fields.array(
          fields.object({
            label: fields.text({ label: 'Label' }),
            href: fields.text({ label: 'URL' }),
          }),
          {
            label: 'Sources',
            itemLabel: (props) => props.fields.label.value,
          },
        ),
        content: fields.mdx({
          label: 'Content',
          components: {
            QA: wrapper({
              label: 'Q&A Block',
              description: 'A question with an editable answer below it',
              schema: {
                question: fields.text({
                  label: 'Question',
                  validation: { isRequired: true },
                }),
              },
            }),
            ImageWithCaption: block({
              label: 'Image with Caption',
              schema: {
                src: fields.text({
                  label: 'Image path (e.g. /images/articles/photo.jpg)',
                  validation: { isRequired: true },
                }),
                alt: fields.text({
                  label: 'Alt text',
                  validation: { isRequired: true },
                }),
                caption: fields.text({
                  label: 'Caption',
                }),
                size: fields.select({
                  label: 'Size',
                  options: [
                    { label: 'Full width', value: 'full' },
                    { label: 'Half width', value: 'half' },
                  ],
                  defaultValue: 'full',
                }),
              },
            }),
          },
        }),
      },
    }),
  },
})
