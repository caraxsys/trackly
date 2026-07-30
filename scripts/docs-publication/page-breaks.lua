local pagebreak = pandoc.RawBlock(
  "openxml",
  '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
)

function Header(header)
  if header.level ~= 1 then
    return nil
  end

  local identifier = header.identifier or ""
  local is_part = false
  for _, class_name in ipairs(header.classes) do
    if class_name == "part-title" then
      is_part = true
    end
  end

  if is_part or identifier:match("^chapter%-") or identifier:match("^appendix%-") then
    return { pagebreak, header }
  end

  return nil
end
