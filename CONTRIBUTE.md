# Style Guide

## 1. Try your best to not use more than one word for a button.

If the button is one of the primary or secondary buttons on the page, use one verb to describe what that button will do. Is the button on a page where it only has to do with editing a single link? Name it "Edit" instead of "Edit Link" or "Share" instead of "Share Link".

### Examples

![Two words](/docs/images/styleguide/twowords.png)
![One word](/docs/images/styleguide/onewords.png)

## 2. Format your code.

Just do it, it makes merge conflicts easier to manage as well as keeping unnecessary whitespace out.

## 3. Use Tailwind CSS to style, do not make new CSS files or in-line CSS

We prefer to use Tailwind CSS, the only time you would use CSS files is to modify Ant Design's pre-defined CSS.

## 4. When working within `/app`, try to use Ant Design 5's Design Principles as much as possible

One example is to use their `<Flex/>` component instead of `<div className="flex">`.

If you are working on pages such as the landing or 404 page, Ant Design 5 is pretty unforgiving with the freedom you can do with design. If you know what you are doing design-wise, you are free to use any other
component.

## 5. Always add `/api/core` before any backend request path

HTTPD has been configured to serve the flask application whenever the URL has `/api/core` in it, to keep all backend routes in one place, keep any routes under `/api/core`
