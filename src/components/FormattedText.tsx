'use client'

import React from 'react'

export interface FormattedTextProps {
  text?: string | null
  className?: string
  style?: React.CSSProperties
  inline?: boolean
  as?: 'div' | 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4'
  role?: string
  'aria-level'?: number
}

interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'bold-italic' | 'code' | 'br'
  value?: string
  children?: InlineToken[]
}

interface TextBlock {
  type: 'p' | 'ul' | 'ol' | 'quote'
  text?: string
  items?: string[]
}

/**
 * Parses inline Markdown tokens:
 * - ***bold-italic*** or ___bold-italic___
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code`
 * - \n (single newline -> <br />)
 */
function parseInline(text: string): InlineToken[] {
  if (!text) return []
  const tokens: InlineToken[] = []
  const regex = /(\*\*\*(?!\s)[\s\S]+?(?<!\s)\*\*\*|___(?!\s)[\s\S]+?(?<!\s)___|\*\*(?!\s)(?:[^*\n]|\*(?!\*))+?(?<!\s)\*\*|__(?!\s)(?:[^_\n]|_(?!_))+?(?<!\s)__|\*(?!\s)[^*\n]+?(?<!\s)\*|_(?!\s)[^_\n]+?(?<!\s)_|`[^`\n]+?`|\n)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    const raw = match[0]
    if (raw === '\n') {
      tokens.push({ type: 'br' })
    } else if ((raw.startsWith('***') && raw.endsWith('***')) || (raw.startsWith('___') && raw.endsWith('___'))) {
      tokens.push({ type: 'bold-italic', children: parseInline(raw.slice(3, -3)) })
    } else if ((raw.startsWith('**') && raw.endsWith('**')) || (raw.startsWith('__') && raw.endsWith('__'))) {
      tokens.push({ type: 'bold', children: parseInline(raw.slice(2, -2)) })
    } else if ((raw.startsWith('*') && raw.endsWith('*')) || (raw.startsWith('_') && raw.endsWith('_'))) {
      tokens.push({ type: 'italic', children: parseInline(raw.slice(1, -1)) })
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) })
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return tokens
}

function renderTokens(tokens: InlineToken[], keyPrefix = 'tk'): React.ReactNode[] {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`
    switch (token.type) {
      case 'text':
        return token.value
      case 'br':
        return <br key={key} />
      case 'bold':
        return <strong key={key} style={{ fontWeight: 800 }}>{token.children ? renderTokens(token.children, `${key}-b`) : token.value}</strong>
      case 'italic':
        return <em key={key} style={{ fontStyle: 'italic' }}>{token.children ? renderTokens(token.children, `${key}-i`) : token.value}</em>
      case 'bold-italic':
        return (
          <strong key={key} style={{ fontWeight: 800 }}>
            <em style={{ fontStyle: 'italic' }}>
              {token.children ? renderTokens(token.children, `${key}-bi`) : token.value}
            </em>
          </strong>
        )
      case 'code':
        return (
          <code
            key={key}
            style={{
              background: 'var(--color-surface-3, rgba(255, 255, 255, 0.08))',
              padding: '0.12rem 0.35rem',
              borderRadius: 4,
              fontSize: '0.9em',
              fontFamily: 'monospace',
            }}
          >
            {token.value}
          </code>
        )
      default:
        return null
    }
  })
}

/**
 * Splits text into block elements:
 * - paragraphs
 * - bullet lists (- item, * item, • item)
 * - numbered lists (1. item, 1) item)
 * - blockquotes (> quote)
 */
function parseBlocks(text: string): TextBlock[] {
  if (!text) return []
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  const rawLines = normalized.split('\n')

  const blocks: TextBlock[] = []
  let currentParagraph: string[] = []
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null
  let currentQuote: string[] = []

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({ type: 'p', text: currentParagraph.join('\n') })
      currentParagraph = []
    }
  }

  function flushList() {
    if (currentList) {
      blocks.push(currentList)
      currentList = null
    }
  }

  function flushQuote() {
    if (currentQuote.length > 0) {
      blocks.push({ type: 'quote', text: currentQuote.join('\n') })
      currentQuote = []
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const trimmed = line.trim()

    // Blank line -> boundary between blocks
    if (!trimmed) {
      flushParagraph()
      flushList()
      flushQuote()
      continue
    }

    // Unordered list item: - item, * item, • item
    const ulMatch = line.match(/^[-*•]\s+(.+)$/)
    if (ulMatch) {
      flushParagraph()
      flushQuote()
      if (!currentList || currentList.type !== 'ul') {
        flushList()
        currentList = { type: 'ul', items: [] }
      }
      currentList.items.push(ulMatch[1])
      continue
    }

    // Ordered list item: 1. item or 1) item
    const olMatch = line.match(/^(\d+)[\.\)]\s+(.+)$/)
    if (olMatch) {
      flushParagraph()
      flushQuote()
      if (!currentList || currentList.type !== 'ol') {
        flushList()
        currentList = { type: 'ol', items: [] }
      }
      currentList.items.push(olMatch[2])
      continue
    }

    // Blockquote: > text
    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph()
      flushList()
      currentQuote.push(quoteMatch[1])
      continue
    }

    // Indented continuation of list item
    if (currentList && currentList.items.length > 0 && /^( {2,}|\t)/.test(line)) {
      const lastIdx = currentList.items.length - 1
      currentList.items[lastIdx] += '\n' + trimmed
      continue
    }

    // Normal paragraph line
    flushList()
    flushQuote()
    currentParagraph.push(line)
  }

  flushParagraph()
  flushList()
  flushQuote()

  return blocks
}

/**
 * FormattedText component:
 * Renders rich text formatting (bold, italics, code, line breaks, bullet lists, numbered lists, blockquotes)
 * safely without dangerouslySetInnerHTML.
 */
export function FormattedText({
  text,
  className,
  style,
  inline = false,
  as,
  role,
  'aria-level': ariaLevel,
}: FormattedTextProps) {
  if (!text || typeof text !== 'string') return null

  // Pure inline rendering
  if (inline) {
    const tokens = parseInline(text)
    if (as) {
      const Wrapper = as
      return (
        <Wrapper className={className} style={style} role={role} aria-level={ariaLevel}>
          {renderTokens(tokens)}
        </Wrapper>
      )
    }
    return <>{renderTokens(tokens)}</>
  }

  const blocks = parseBlocks(text)

  // If there are no blocks parsed (e.g. whitespace only), render nothing
  if (blocks.length === 0) return null

  // If consumer explicitly wants a paragraph container
  if (as === 'p') {
    return (
      <p className={className} style={style} role={role} aria-level={ariaLevel}>
        {renderTokens(parseInline(text))}
      </p>
    )
  }

  const Wrapper = as || 'div'

  return (
    <Wrapper className={className} style={style} role={role} aria-level={ariaLevel}>
      {blocks.map((block, idx) => {
        const isLast = idx === blocks.length - 1

        if (block.type === 'p' && block.text) {
          const tokens = parseInline(block.text)
          // If only 1 block total and no special container, avoid extra bottom margin
          const pMarginBottom = isLast ? 0 : '0.65rem'
          return (
            <p
              key={idx}
              style={{
                margin: 0,
                marginBottom: pMarginBottom,
                lineHeight: 'inherit',
              }}
            >
              {renderTokens(tokens, `p-${idx}`)}
            </p>
          )
        }

        if (block.type === 'ul' && block.items) {
          return (
            <ul
              key={idx}
              style={{
                paddingLeft: '1.4rem',
                margin: '0.45rem 0',
                marginBottom: isLast ? 0 : '0.65rem',
                listStyleType: 'disc',
              }}
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} style={{ marginBottom: '0.25rem', lineHeight: 'inherit' }}>
                  {renderTokens(parseInline(item), `ul-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'ol' && block.items) {
          return (
            <ol
              key={idx}
              style={{
                paddingLeft: '1.4rem',
                margin: '0.45rem 0',
                marginBottom: isLast ? 0 : '0.65rem',
                listStyleType: 'decimal',
              }}
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} style={{ marginBottom: '0.25rem', lineHeight: 'inherit' }}>
                  {renderTokens(parseInline(item), `ol-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ol>
          )
        }

        if (block.type === 'quote' && block.text) {
          return (
            <blockquote
              key={idx}
              style={{
                borderLeft: '3px solid var(--color-gold, #F28014)',
                paddingLeft: '0.85rem',
                margin: '0.55rem 0',
                marginBottom: isLast ? 0 : '0.65rem',
                fontStyle: 'italic',
                opacity: 0.95,
                lineHeight: 'inherit',
              }}
            >
              {renderTokens(parseInline(block.text), `q-${idx}`)}
            </blockquote>
          )
        }

        return null
      })}
    </Wrapper>
  )
}
export default FormattedText
