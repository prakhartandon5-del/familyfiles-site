/**
 * Product slider — progressive enhancement only.
 *
 * The track is a native scroll-snap container, so swiping, keyboard scrolling
 * and paging already work with this file absent or blocked. This adds the
 * arrows, the dots, and gentle autoplay that stops as soon as someone
 * interacts or hovers.
 */
(function () {
  var track = document.getElementById('track')
  var dotsBox = document.getElementById('dots')
  if (!track || !dotsBox) return

  var slides = Array.prototype.slice.call(track.querySelectorAll('.slide'))
  if (slides.length < 2) return

  var index = 0
  var timer = null
  var INTERVAL = 4500
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* Dots */
  var dots = slides.map(function (_, i) {
    var b = document.createElement('button')
    b.type = 'button'
    b.setAttribute('role', 'tab')
    b.setAttribute('aria-label', 'Screen ' + (i + 1) + ' of ' + slides.length)
    b.setAttribute('aria-current', i === 0 ? 'true' : 'false')
    b.addEventListener('click', function () { stop(); go(i) })
    dotsBox.appendChild(b)
    return b
  })

  function paint(i) {
    index = i
    for (var k = 0; k < dots.length; k++) {
      dots[k].setAttribute('aria-current', k === i ? 'true' : 'false')
    }
  }

  function go(i) {
    var n = (i + slides.length) % slides.length
    track.scrollTo({ left: slides[n].offsetLeft - slides[0].offsetLeft, behavior: reduced ? 'auto' : 'smooth' })
    paint(n)
  }

  /* Keep the dots honest when the user swipes the track directly. */
  var raf = null
  track.addEventListener('scroll', function () {
    if (raf) return
    raf = requestAnimationFrame(function () {
      raf = null
      var w = slides[0].getBoundingClientRect().width || 1
      paint(Math.round(track.scrollLeft / w))
    })
  }, { passive: true })

  Array.prototype.forEach.call(document.querySelectorAll('[data-slide]'), function (btn) {
    btn.addEventListener('click', function () {
      stop()
      go(index + (btn.getAttribute('data-slide') === 'next' ? 1 : -1))
    })
  })

  function start() {
    if (reduced || timer) return
    timer = setInterval(function () { go(index + 1) }, INTERVAL)
  }
  function stop() { if (timer) { clearInterval(timer); timer = null } }

  var viewport = track.parentNode
  viewport.addEventListener('mouseenter', stop)
  viewport.addEventListener('mouseleave', start)
  viewport.addEventListener('focusin', stop)
  track.addEventListener('touchstart', stop, { passive: true })
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start()
  })

  paint(0)
  start()
})()
