# Style Guide

## 1. Try your best to not use more than one word for a button.

If the button is one of the primary or secondary buttons on the page, use one verb to describe what that button will do. Is the button on a page where it only has to do with editing a single link? Name it "Edit" instead of "Edit Link" or "Share" instead of "Share Link".

### Examples

![Two words](/docs/images/styleguide/twowords.png)
![One word](/docs/images/styleguide/onewords.png)

## 2. Do not use the `react-icons` for your icons.

This is a "hail mary" in case Ant Design does not provide the icon you need, such as X (Twitter) or YouTube's logos. Using this for any other reason would cause inconsistencies within the application.

## 3. Format your code.

Just do it, it makes merge conflicts easier to manage as well as keeping unnecessary whitespace out.

## 4. Do not create new class names to style.

We prefer to use in-line CSS, the only time you would use CSS files is to modify Ant Design's pre-defined CSS. If you have to use a reptitive CSS style, chances are that Ant Design already made it for you.
