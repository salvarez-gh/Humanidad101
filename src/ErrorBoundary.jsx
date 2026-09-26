// ══════════════════════════════════════════════════════════════════
//  ErrorBoundary.jsx — Límite de error de React
//  React solo captura errores de render en componentes de clase. Este
//  límite envuelve una parte de la interfaz para que un fallo de render
//  muestre un respaldo en vez de dejar la pantalla en blanco, y reporta
//  el error a la observabilidad.
// ══════════════════════════════════════════════════════════════════

import { Component } from 'react'
import { captureException } from './analytics'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    captureException(error, { boundary: this.props.name, componentStack: info?.componentStack })
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}
