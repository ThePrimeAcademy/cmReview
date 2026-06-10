import DOMPurify from 'dompurify';
import { decodeCmMarkup } from '../lib/cmMarkup';

// ClassMarker question/option bodies arrive as HTML (may include images and
// math markup). Sanitize before rendering — never trust external content.
const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'span', 'div',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'img', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'hr',
  ],
  ALLOWED_ATTR: ['src', 'alt', 'width', 'height', 'style', 'colspan', 'rowspan', 'class'],
};

export default function QuestionHtml({ html, className }) {
  if (html == null || html === '') return null;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeCmMarkup(html), CONFIG) }}
    />
  );
}
